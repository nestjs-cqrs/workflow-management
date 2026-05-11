import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { WorkflowInstance, WorkflowStatus } from '@turkelk/nestjs-cqrs-workflow';
import { GetPendingTasksQuery } from './get-pending-tasks.query';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';

@QueryHandler(GetPendingTasksQuery)
export class GetPendingTasksHandler
  implements IQueryHandler<GetPendingTasksQuery>
{
  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
  ) {}

  async execute(
    query: GetPendingTasksQuery,
  ): Promise<Result<PendingTaskResponseDto[]>> {
    const where: Record<string, unknown> = {
      status: In([WorkflowStatus.STARTED, WorkflowStatus.IN_PROGRESS]),
    };

    if (query.app) {
      where['processDefinitionId'] = query.app;
    }

    const instances = await this.workflowInstanceRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const dtos: PendingTaskResponseDto[] = instances.map((instance) => ({
      id: instance.id,
      processDefinitionId: instance.processDefinitionId,
      processInstanceId: instance.processInstanceId,
      commandType: instance.commandType,
      commandPayload: instance.commandPayload,
      status: instance.status,
      correlationId: instance.correlationId,
      processVariables: instance.processVariables,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    }));

    return Result.success(dtos);
  }
}
