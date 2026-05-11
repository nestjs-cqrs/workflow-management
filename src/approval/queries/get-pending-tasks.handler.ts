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
      // Filter by specific process definition ID
      const processInstances = await this.kogitoApi.listInstances(query.app);
      instances = processInstances.filter((i) => i.state === 1);
    } else {
      instances = await this.kogitoApi.listAllActiveInstances();
    }

    const tasks: PendingTaskResponseDto[] = [];

    for (const instance of instances) {
      // Get detailed info including current node/state
      const detail = await this.kogitoApi.getInstance(
        instance.processId,
        instance.id,
      );

      // Find the currently active node — this tells us which step/role is pending
      const activeNodes = detail.nodes?.filter((n) => !n.exit) ?? [];
      const waitingNode = activeNodes.find((n) =>
        n.name.startsWith('WaitApproval'),
      );

      if (waitingNode) {
        tasks.push({
          processInstanceId: instance.id,
          processId: instance.processId,
          currentState: waitingNode.name,
          variables: detail.variables ?? {},
          startedAt: instance.start ?? '',
        });
      }
    }

    return Result.success(tasks);
  }
}
