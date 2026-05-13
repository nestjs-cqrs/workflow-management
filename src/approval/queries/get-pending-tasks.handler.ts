import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetPendingTasksQuery } from './get-pending-tasks.query';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';
import { KogitoApiService } from '../services/kogito-api.service';
import { WorkflowRegistryService } from '../../workflow-registry/workflow-registry.service';

@QueryHandler(GetPendingTasksQuery)
export class GetPendingTasksHandler implements IQueryHandler<GetPendingTasksQuery> {
  constructor(
    private readonly kogitoApi: KogitoApiService,
    private readonly registry: WorkflowRegistryService,
  ) {}

  async execute(
    query: GetPendingTasksQuery,
  ): Promise<Result<PendingTaskResponseDto[]>> {
    let instances;

    if (query.app) {
      instances = await this.kogitoApi.listInstances(query.app);
    } else {
      instances = await this.kogitoApi.listAllActiveInstances();
    }

    const tasks: PendingTaskResponseDto[] = [];

    for (const instance of instances) {
      const vars = instance.variables;
      const stepStatus = vars['stepStatus'] as string | undefined;

      if (stepStatus !== 'awaiting_approval') continue;

      const requiredRole =
        (vars['requiredRole'] as string | undefined)?.toLowerCase() ?? '';
      const stepNumber = this.parseStepNumber(vars);

      const isAdmin = query.userRoles.includes('admin');
      if (!isAdmin && !query.userRoles.includes(requiredRole)) continue;

      tasks.push({
        processInstanceId: instance.id,
        processId: instance.processId,
        currentState: `WaitApprovalStep${stepNumber}_${requiredRole.toUpperCase()}`,
        requiredRole,
        variables: vars,
        startedAt: instance.start ?? '',
        stepNumber,
        stepLabel: this.registry.getStepLabel(instance.processId, stepNumber),
        workflowDisplayName: this.registry.getDisplayName(instance.processId),
        highlightedVariables: this.registry.getHighlightedVariables(
          instance.processId,
          vars,
        ),
        nodeCount: 0,
      });
    }

    return Result.success(tasks);
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
