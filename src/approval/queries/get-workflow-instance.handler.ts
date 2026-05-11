import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { WorkflowInstance } from '@turkelk/nestjs-cqrs-workflow';
import { GetWorkflowInstanceQuery } from './get-workflow-instance.query';
import { WorkflowInstanceResponseDto } from '../dtos/workflow-instance-response.dto';

@QueryHandler(GetWorkflowInstanceQuery)
export class GetWorkflowInstanceHandler
  implements IQueryHandler<GetWorkflowInstanceQuery>
{
  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
  ) {}

  async execute(
    query: GetWorkflowInstanceQuery,
  ): Promise<Result<WorkflowInstanceResponseDto>> {
    const instance = await this.workflowInstanceRepo.findOne({
      where: { id: query.id },
    });

    if (!instance) {
      return Result.notFound(`Workflow instance ${query.id} not found`);
    }

    const dto: WorkflowInstanceResponseDto = {
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
      completedAt: instance.completedAt,
    };

    return Result.success(dto);
  }
}
