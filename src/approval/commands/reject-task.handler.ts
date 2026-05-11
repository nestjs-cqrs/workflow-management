import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { RejectTaskCommand } from './reject-task.command';
import { KogitoEventService } from '../services/kogito-event.service';
import { KogitoApiService } from '../services/kogito-api.service';

@CommandHandler(RejectTaskCommand)
export class RejectTaskHandler implements ICommandHandler<RejectTaskCommand> {
  private readonly logger = new Logger(RejectTaskHandler.name);

  constructor(
    private readonly kogitoEventService: KogitoEventService,
    private readonly kogitoApi: KogitoApiService,
  ) {}

  async execute(command: RejectTaskCommand): Promise<Result<void>> {
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
        approved: false,
        approvedById: command.rejectedById,
        role: command.role,
        feedback: command.feedback,
      },
    );

    this.logger.log({
      msg: 'Task rejected',
      processInstanceId: command.processInstanceId,
      processId: command.processId,
      rejectedById: command.rejectedById,
      role: command.role,
    });

    return Result.success(undefined);
  }
}
