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

    const vars = instance.variables;
    const stepStatus = vars['stepStatus'] as string | undefined;

    if (stepStatus !== 'awaiting_approval') {
      return Result.conflict(
        'No pending approval found for this workflow instance',
      );
    }

    const requiredRole =
      (vars['requiredRole'] as string | undefined)?.toLowerCase() ?? '';
    const isAdmin = command.userRoles.includes('admin');
    if (
      !requiredRole ||
      (!isAdmin && !command.userRoles.includes(requiredRole))
    ) {
      return Result.forbidden(
        `Role '${requiredRole}' is required to reject this step`,
      );
    }

    await this.kogitoEventService.publishApprovalDecision(
      command.processInstanceId,
      {
        approved: false,
        approvedById: command.userId,
        role: requiredRole,
        feedback: command.feedback,
      },
    );

    this.logger.log({
      msg: 'Task rejected',
      processInstanceId: command.processInstanceId,
      processId: command.processId,
      userId: command.userId,
      requiredRole,
    });

    return Result.success(undefined);
  }
}
