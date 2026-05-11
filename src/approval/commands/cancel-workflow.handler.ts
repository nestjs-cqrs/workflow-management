import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import {
  WorkflowInstance,
  WorkflowStatus,
  KogitoClient,
} from '@turkelk/nestjs-cqrs-workflow';
import { CancelWorkflowCommand } from './cancel-workflow.command';

@CommandHandler(CancelWorkflowCommand)
export class CancelWorkflowHandler
  implements ICommandHandler<CancelWorkflowCommand>
{
  private readonly logger = new Logger(CancelWorkflowHandler.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
    private readonly kogitoClient: KogitoClient,
  ) {}

  async execute(command: CancelWorkflowCommand): Promise<Result<void>> {
    const workflowInstance = await this.workflowInstanceRepo.findOne({
      where: { id: command.workflowInstanceId },
    });

    if (!workflowInstance) {
      return Result.notFound(
        `Workflow instance ${command.workflowInstanceId} not found`,
      );
    }

    if (
      workflowInstance.status === WorkflowStatus.COMPLETED ||
      workflowInstance.status === WorkflowStatus.ABORTED
    ) {
      return Result.conflict(
        `Workflow instance ${command.workflowInstanceId} is already ${workflowInstance.status}`,
      );
    }

    await this.kogitoClient.abortProcess(
      workflowInstance.processDefinitionId,
      workflowInstance.processInstanceId,
    );

    workflowInstance.status = WorkflowStatus.ABORTED;
    workflowInstance.completedAt = new Date();
    await this.workflowInstanceRepo.save(workflowInstance);

    this.logger.log({
      msg: 'Workflow cancelled',
      workflowInstanceId: command.workflowInstanceId,
      cancelledById: command.cancelledById,
      reason: command.reason,
    });

    return Result.success(undefined);
  }
}
