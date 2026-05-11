import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { WorkflowInstance, WorkflowStatus } from '@turkelk/nestjs-cqrs-workflow';
import { RejectTaskCommand } from './reject-task.command';
import { KogitoEventService } from '../services/kogito-event.service';

@CommandHandler(RejectTaskCommand)
export class RejectTaskHandler implements ICommandHandler<RejectTaskCommand> {
  private readonly logger = new Logger(RejectTaskHandler.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
    private readonly kogitoEventService: KogitoEventService,
  ) {}

  async execute(command: RejectTaskCommand): Promise<Result<void>> {
    const workflowInstance = await this.workflowInstanceRepo.findOne({
      where: { id: command.workflowInstanceId },
    });

    if (!workflowInstance) {
      return Result.notFound(
        `Workflow instance ${command.workflowInstanceId} not found`,
      );
    }

    if (
      workflowInstance.status !== WorkflowStatus.STARTED &&
      workflowInstance.status !== WorkflowStatus.IN_PROGRESS
    ) {
      return Result.conflict(
        `Workflow instance ${command.workflowInstanceId} is not in a pending state (current: ${workflowInstance.status})`,
      );
    }

    await this.kogitoEventService.publishApprovalDecision(
      workflowInstance.processInstanceId,
      {
        approved: false,
        approvedById: command.rejectedById,
        role: command.role,
        feedback: command.feedback,
      },
    );

    this.logger.log({
      msg: 'Task rejected',
      workflowInstanceId: command.workflowInstanceId,
      rejectedById: command.rejectedById,
      role: command.role,
    });

    return Result.success(undefined);
  }
}
