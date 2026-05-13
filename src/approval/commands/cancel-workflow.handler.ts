import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { CancelWorkflowCommand } from './cancel-workflow.command';
import { KogitoApiService } from '../services/kogito-api.service';

@CommandHandler(CancelWorkflowCommand)
export class CancelWorkflowHandler implements ICommandHandler<CancelWorkflowCommand> {
  private readonly logger = new Logger(CancelWorkflowHandler.name);

  constructor(private readonly kogitoApi: KogitoApiService) {}

  async execute(command: CancelWorkflowCommand): Promise<Result<void>> {
    // Verify the instance exists and check its state
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

    if (instance.state === 'COMPLETED' || instance.state === 'ABORTED') {
      return Result.conflict(
        `Workflow instance ${command.processInstanceId} is already terminated (state: ${instance.state})`,
      );
    }

    await this.kogitoApi.abortInstance(
      command.processId,
      command.processInstanceId,
    );

    this.logger.log({
      msg: 'Workflow cancelled',
      processInstanceId: command.processInstanceId,
      processId: command.processId,
      cancelledById: command.cancelledById,
      reason: command.reason,
    });

    return Result.success(undefined);
  }
}
