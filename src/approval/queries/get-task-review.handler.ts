import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetTaskReviewQuery } from './get-task-review.query';
import {
  TaskReviewResponseDto,
  TimelineStepDto,
} from '../dtos/task-review-response.dto';
import { KogitoApiService } from '../services/kogito-api.service';
import { WorkflowRegistryService } from '../../workflow-registry/workflow-registry.service';

@QueryHandler(GetTaskReviewQuery)
export class GetTaskReviewHandler implements IQueryHandler<GetTaskReviewQuery> {
  constructor(
    private readonly kogitoApi: KogitoApiService,
    private readonly registry: WorkflowRegistryService,
  ) {}

  async execute(
    query: GetTaskReviewQuery,
  ): Promise<Result<TaskReviewResponseDto>> {
    let instance;
    try {
      instance = await this.kogitoApi.getInstance(
        query.processId,
        query.processInstanceId,
      );
    } catch {
      return Result.notFound(
        `Workflow instance ${query.processInstanceId} not found`,
      );
    }

    const vars = instance.variables;
    const stepStatus = vars['stepStatus'] as string | undefined;
    const requiredRole =
      (vars['requiredRole'] as string | undefined)?.toLowerCase() ?? '';
    const stepNumber = this.parseStepNumber(vars);

    const config = this.registry.getByProcessId(instance.processId);
    const stepLabel = this.registry.getStepLabel(
      instance.processId,
      stepNumber,
    );

    const isActive = stepStatus === 'awaiting_approval';
    const currentState = `WaitApprovalStep${stepNumber}_${requiredRole.toUpperCase()}`;

    const totalSteps = config
      ? Object.keys(config.stepLabels).length
      : stepNumber;
    const timeline = this.buildTimeline(
      vars,
      instance.processId,
      stepNumber,
      totalSteps,
    );

    return Result.success({
      task: {
        processInstanceId: instance.id,
        processId: instance.processId,
        currentState,
        requiredRole,
        stepNumber,
        stepLabel,
        variables: vars,
        startedAt: instance.start ?? '',
        isActive,
      },
      timeline,
      workflowConfig: config ?? undefined,
    });
  }

  private buildTimeline(
    variables: Record<string, unknown>,
    processId: string,
    currentStep: number,
    totalSteps: number,
  ): TimelineStepDto[] {
    const steps: TimelineStepDto[] = [];

    for (let s = 1; s <= totalSteps; s++) {
      const label = this.registry.getStepLabel(processId, s);
      const feedbackKey = `step${s}Feedback`;
      const rawFeedback = variables[feedbackKey];
      const feedback =
        typeof rawFeedback === 'string' && rawFeedback
          ? rawFeedback
          : undefined;

      let status: 'completed' | 'active' | 'pending';
      let detail: string | undefined;

      if (s < currentStep) {
        status = 'completed';
        detail = feedback ? 'Rejected then approved' : 'Approved';
      } else if (s === currentStep) {
        const stepStatus = variables['stepStatus'] as string | undefined;
        if (stepStatus === 'awaiting_approval') {
          status = 'active';
          const role =
            (variables['requiredRole'] as string | undefined)?.toUpperCase() ??
            '';
          detail = `Waiting for ${role} approval`;
        } else if (stepStatus === 'generating') {
          status = 'active';
          detail = 'Generating';
        } else {
          status = 'completed';
          detail = stepStatus ?? 'Completed';
        }
      } else {
        status = 'pending';
      }

      steps.push({
        stepNumber: s,
        label,
        status,
        detail,
        feedback,
        nodes: [],
      });
    }

    return steps;
  }

  private parseStepNumber(vars: Record<string, unknown>): number {
    const raw = vars['stepNumber'];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') return parseInt(raw, 10) || 0;

    const outputPath = vars['stepOutputPath'];
    if (typeof outputPath === 'string') {
      const match = outputPath.match(/step-(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    return 0;
  }
}
