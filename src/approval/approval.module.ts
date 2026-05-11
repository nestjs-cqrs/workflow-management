import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApprovalController } from './controllers/approval.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { ApproveTaskHandler } from './commands/approve-task.handler';
import { RejectTaskHandler } from './commands/reject-task.handler';
import { CancelWorkflowHandler } from './commands/cancel-workflow.handler';
import { GetPendingTasksHandler } from './queries/get-pending-tasks.handler';
import { GetWorkflowInstanceHandler } from './queries/get-workflow-instance.handler';
import { KogitoEventService } from './services/kogito-event.service';
import { KogitoApiService } from './services/kogito-api.service';

const CommandHandlers = [
  ApproveTaskHandler,
  RejectTaskHandler,
  CancelWorkflowHandler,
];

const QueryHandlers = [GetPendingTasksHandler, GetWorkflowInstanceHandler];

@Module({
  imports: [CqrsModule],
  controllers: [ApprovalController, WorkflowController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    KogitoEventService,
    KogitoApiService,
  ],
})
export class ApprovalModule {}
