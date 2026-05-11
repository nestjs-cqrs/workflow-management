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

    if (instance.state !== 1) {
      return Result.conflict(
        `Workflow instance ${command.processInstanceId} is not active (state: ${instance.state})`,
      );
    }

    const activeNodes = instance.nodes?.filter((n: { exit?: string }) => !n.exit) ?? [];
    const waitingNode = activeNodes.find((n: { name: string }) =>
      n.name.startsWith('WaitApproval'),
    );

    if (!waitingNode) {
      return Result.conflict('No pending approval found for this workflow instance');
    }

    const requiredRole = waitingNode.name.split('_').pop()?.toLowerCase();
    if (!requiredRole || !command.userRoles.includes(requiredRole)) {
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
