import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetActiveWorkflowsQuery } from './get-active-workflows.query';
import { KogitoApiService } from '../services/kogito-api.service';

export interface ActiveWorkflowDto {
  processInstanceId: string;
  processId: string;
  processName: string;
  currentState: string;
  requiredRole: string;
  variables: Record<string, unknown>;
  startedAt: string;
}

@QueryHandler(GetActiveWorkflowsQuery)
export class GetActiveWorkflowsHandler implements IQueryHandler<GetActiveWorkflowsQuery> {
  constructor(private readonly kogitoApi: KogitoApiService) {}

  async execute(
    query: GetActiveWorkflowsQuery,
  ): Promise<Result<ActiveWorkflowDto[]>> {
    let instances;

    if (query.app) {
      instances = await this.kogitoApi.listInstances(query.app);
    } else {
      instances = await this.kogitoApi.listAllActiveInstances();
    }

    const workflows: ActiveWorkflowDto[] = [];

    for (const instance of instances) {
      const vars = instance.variables;
      const stepStatus = (vars['stepStatus'] as string) ?? 'unknown';
      const requiredRole =
        (vars['requiredRole'] as string | undefined)?.toLowerCase() ?? '';
      const rawStep = vars['stepNumber'];
      const stepNumber =
        typeof rawStep === 'number' || typeof rawStep === 'string'
          ? rawStep
          : '';

      const currentState =
        stepStatus === 'awaiting_approval'
          ? `WaitApprovalStep${stepNumber}_${requiredRole.toUpperCase()}`
          : stepStatus;

      workflows.push({
        processInstanceId: instance.id,
        processId: instance.processId,
        processName: instance.processName ?? instance.processId,
        currentState,
        requiredRole,
        variables: vars,
        startedAt: instance.start ?? '',
      });
    }

    return Result.success(workflows);
  }
}
