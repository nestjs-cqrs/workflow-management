import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetPendingTasksQuery } from './get-pending-tasks.query';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';
import { KogitoApiService } from '../services/kogito-api.service';

@QueryHandler(GetPendingTasksQuery)
export class GetPendingTasksHandler
  implements IQueryHandler<GetPendingTasksQuery>
{
  constructor(private readonly kogitoApi: KogitoApiService) {}

  async execute(
    query: GetPendingTasksQuery,
  ): Promise<Result<PendingTaskResponseDto[]>> {
    let instances;

    if (query.app) {
      const processInstances = await this.kogitoApi.listInstances(query.app);
      instances = processInstances.filter((i) => i.state === 'ACTIVE');
    } else {
      instances = await this.kogitoApi.listAllActiveInstances();
    }

    const tasks: PendingTaskResponseDto[] = [];

    for (const instance of instances) {
      const detail = await this.kogitoApi.getInstance(
        instance.processId,
        instance.id,
      );

      const activeNodes = detail.nodes?.filter((n: { exit?: string }) => !n.exit) ?? [];
      const waitingNode = activeNodes.find((n: { name: string }) =>
        n.name.startsWith('WaitApproval'),
      );

      if (waitingNode) {
        const requiredRole =
          waitingNode.name.split('_').pop()?.toLowerCase() ?? '';

        if (query.userRoles.includes(requiredRole)) {
          tasks.push({
            processInstanceId: instance.id,
            processId: instance.processId,
            currentState: waitingNode.name,
            requiredRole,
            variables: detail.variables ?? {},
            startedAt: instance.start ?? '',
          });
        }
      }
    }

    return Result.success(tasks);
  }
}
