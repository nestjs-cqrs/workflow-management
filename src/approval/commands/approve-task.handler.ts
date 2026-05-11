import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { ApproveTaskCommand } from './approve-task.command';
import { KogitoEventService } from '../services/kogito-event.service';
import { KogitoApiService } from '../services/kogito-api.service';

@CommandHandler(ApproveTaskCommand)
export class ApproveTaskHandler implements ICommandHandler<ApproveTaskCommand> {
  private readonly logger = new Logger(ApproveTaskHandler.name);

  constructor(
    private readonly kogitoEventService: KogitoEventService,
    private readonly kogitoApi: KogitoApiService,
  ) {}

  async execute(command: ApproveTaskCommand): Promise<Result<void>> {
    // Verify the instance exists and is active in Kogito
    let instance;
    try {
      instance = await this.kogitoApi.getInstance(
        command.processId,
        command.processInstanceId,
      );
    } catch {
      return Result.notFound(
        `Workflow instance ${command.processInstanceId} not found in Kogito`,
      );
    }

    if (instance.state !== 1) {
      return Result.conflict(
        `Workflow instance ${command.processInstanceId} is not active (state: ${instance.state})`,
      );
    }

    await this.kogitoEventService.publishApprovalDecision(
      command.processInstanceId,
      {
        approved: true,
        approvedById: command.approvedById,
        role: command.role,
        feedback: command.comment,
      },
    );

    this.logger.log({
      msg: 'Task approved',
      processInstanceId: command.processInstanceId,
      processId: command.processId,
      approvedById: command.approvedById,
      role: command.role,
    });

    return Result.success(undefined);
  }
}
