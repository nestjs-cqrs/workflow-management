import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetWorkflowInstanceQuery } from './get-workflow-instance.query';
import { WorkflowInstanceResponseDto } from '../dtos/workflow-instance-response.dto';
import { KogitoApiService } from '../services/kogito-api.service';

@QueryHandler(GetWorkflowInstanceQuery)
export class GetWorkflowInstanceHandler
  implements IQueryHandler<GetWorkflowInstanceQuery>
{
  constructor(private readonly kogitoApi: KogitoApiService) {}

  async execute(
    query: GetWorkflowInstanceQuery,
  ): Promise<Result<WorkflowInstanceResponseDto>> {
    let instance;
    try {
      instance = await this.kogitoApi.getInstance(
        query.processId,
        query.instanceId,
      );
    } catch {
      return Result.notFound(
        `Workflow instance ${query.instanceId} not found in Kogito`,
      );
    }

    const dto: WorkflowInstanceResponseDto = {
      id: instance.id,
      processId: instance.processId,
      state: instance.state,
      variables: instance.variables ?? {},
      nodes: (instance.nodes ?? []).map((n) => ({
        name: n.name,
        type: n.type,
        enter: n.enter,
        exit: n.exit,
      })),
      start: instance.start ?? '',
      end: instance.end,
    };

    return Result.success(dto);
  }
}
