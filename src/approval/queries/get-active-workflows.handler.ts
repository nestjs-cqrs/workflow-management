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
export class GetActiveWorkflowsHandler
  implements IQueryHandler<GetActiveWorkflowsQuery>
{
  constructor(private readonly kogitoApi: KogitoApiService) {}

  async execute(
    query: GetActiveWorkflowsQuery,
  ): Promise<Result<ActiveWorkflowDto[]>> {
    let instances;

    if (query.app) {
      const processInstances = await this.kogitoApi.listInstances(query.app);
      instances = processInstances.filter((i) => i.state === 'ACTIVE');
    } else {
      instances = await this.kogitoApi.listAllActiveInstances();
    }

    const workflows: ActiveWorkflowDto[] = [];

    for (const instance of instances) {
      const activeNodes =
        instance.nodes?.filter((n) => !n.exit) ?? [];
      const waitingNode = activeNodes.find((n) =>
        n.name.startsWith('WaitApproval'),
      );

      const currentState = waitingNode?.name
        ?? activeNodes.find((n) => n.type === 'EventNode')?.name
        ?? 'unknown';

      const requiredRole =
        waitingNode?.name.split('_').pop()?.toLowerCase() ?? '';

      workflows.push({
        processInstanceId: instance.id,
        processId: instance.processId,
        processName: instance.processName ?? instance.processId,
        currentState,
        requiredRole,
        variables: instance.variables ?? {},
        startedAt: instance.start ?? '',
      });
    }

    return Result.success(workflows);
  }
}
