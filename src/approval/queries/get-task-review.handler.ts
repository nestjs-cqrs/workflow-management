import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetTaskReviewQuery } from './get-task-review.query';
import {
  TaskReviewResponseDto,
  TimelineStepDto,
} from '../dtos/task-review-response.dto';
import {
  KogitoApiService,
  KogitoNodeInstance,
} from '../services/kogito-api.service';
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

    const nodes = instance.nodes ?? [];
    const activeNodes = nodes.filter((n) => !n.exit);
    const waitingNode = activeNodes.find((n) =>
      n.name.startsWith('WaitApproval'),
    );

    const config = this.registry.getByProcessId(instance.processId);
    const pattern = config?.approvalNodePattern
      ? new RegExp(config.approvalNodePattern)
      : /WaitApprovalStep(\d+)_(\w+)/;

    let stepNumber = 0;
    let requiredRole = '';
    let currentState = '';

    if (waitingNode) {
      currentState = waitingNode.name;
      const match = waitingNode.name.match(pattern);
      if (match) {
        stepNumber = parseInt(match[1], 10);
        requiredRole = (match[2] ?? '').toLowerCase();
      }
    } else {
      const lastApprovalNode = [...nodes]
        .filter((n) => n.name.startsWith('WaitApproval'))
        .sort(
          (a, b) => new Date(b.enter).getTime() - new Date(a.enter).getTime(),
        )[0];
      if (lastApprovalNode) {
        currentState = lastApprovalNode.name;
        const match = lastApprovalNode.name.match(pattern);
        if (match) {
          stepNumber = parseInt(match[1], 10);
          requiredRole = (match[2] ?? '').toLowerCase();
        }
      }
    }

    const stepLabel = this.registry.getStepLabel(
      instance.processId,
      stepNumber,
    );

    const variables = instance.variables ?? {};
    const timeline = this.buildTimeline(
      nodes,
      variables,
      instance.processId,
      pattern,
    );

    const isActive = !!waitingNode && instance.state === 'ACTIVE';

    return Result.success({
      task: {
        processInstanceId: instance.id,
        processId: instance.processId,
        currentState,
        requiredRole,
        stepNumber,
        stepLabel,
        variables,
        startedAt: instance.start ?? '',
        isActive,
      },
      timeline,
      workflowConfig: config ?? undefined,
    });
  }

  private buildTimeline(
    nodes: KogitoNodeInstance[],
    variables: Record<string, unknown>,
    processId: string,
    pattern: RegExp,
  ): TimelineStepDto[] {
    const sortedNodes = [...nodes].sort(
      (a, b) => new Date(a.enter).getTime() - new Date(b.enter).getTime(),
    );

    const stepNodeMap = new Map<number, KogitoNodeInstance[]>();
    for (const node of sortedNodes) {
      const match = node.name.match(
        /(?:GenerateStep|WaitGenStep|WaitApprovalStep|EvalStep|RejectStep)(\d+)/,
      );
      if (match) {
        const num = parseInt(match[1], 10);
        const existing = stepNodeMap.get(num) ?? [];
        existing.push(node);
        stepNodeMap.set(num, existing);
      }
    }

    const maxStep = Math.max(...Array.from(stepNodeMap.keys()), 0);

    const totalSteps = Math.max(maxStep, 8);
    const steps: TimelineStepDto[] = [];

    for (let s = 1; s <= totalSteps; s++) {
      const stepNodes = stepNodeMap.get(s) ?? [];
      const label = this.registry.getStepLabel(processId, s);

      if (stepNodes.length === 0) {
        steps.push({
          stepNumber: s,
          label,
          status: 'pending',
          nodes: [],
        });
        continue;
      }

      const activeNode = stepNodes.find((n) => !n.exit);
      const firstNode = stepNodes[0];
      const lastNode = stepNodes[stepNodes.length - 1];
      const enterTime = firstNode.enter;
      const exitTime = activeNode ? undefined : lastNode.exit;
      const durationMs =
        enterTime && exitTime
          ? new Date(exitTime).getTime() - new Date(enterTime).getTime()
          : undefined;

      let status: 'completed' | 'active' | 'pending' = 'completed';
      let detail: string | undefined;

      if (activeNode) {
        status = 'active';
        if (activeNode.name.startsWith('WaitApproval')) {
          const roleMatch = activeNode.name.match(pattern);
          const role = roleMatch?.[2]?.toUpperCase() ?? '';
          detail = `Waiting for ${role} approval`;
        } else if (
          activeNode.name.startsWith('GenerateStep') ||
          activeNode.name.startsWith('WaitGenStep')
        ) {
          detail = 'Generating';
        }
      } else {
        const rejected = stepNodes.find((n) => n.name.startsWith('RejectStep'));
        if (rejected) {
          detail = 'Rejected then approved';
        } else {
          detail = 'Approved';
        }
      }

      const feedbackKey = `step${s}Feedback`;
      const rawFeedback = variables[feedbackKey];
      const feedback =
        typeof rawFeedback === 'string' ? rawFeedback : undefined;

      steps.push({
        stepNumber: s,
        label,
        status,
        enterTime,
        exitTime,
        durationMs,
        detail,
        feedback,
        nodes: stepNodes.map((n) => ({
          name: n.name,
          type: n.type,
          enter: n.enter,
          exit: n.exit,
        })),
      });
    }

    return steps;
  }
}
