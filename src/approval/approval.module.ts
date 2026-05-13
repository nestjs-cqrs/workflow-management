import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApprovalController } from './controllers/approval.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { ApproveTaskHandler } from './commands/approve-task.handler';
import { RejectTaskHandler } from './commands/reject-task.handler';
import { CancelWorkflowHandler } from './commands/cancel-workflow.handler';
import { GetPendingTasksHandler } from './queries/get-pending-tasks.handler';
import { GetActiveWorkflowsHandler } from './queries/get-active-workflows.handler';
import { GetWorkflowInstanceHandler } from './queries/get-workflow-instance.handler';
import { GetTaskReviewHandler } from './queries/get-task-review.handler';
import { KogitoEventService } from './services/kogito-event.service';
import { KogitoApiService } from './services/kogito-api.service';
import { WorkflowRegistryModule } from '../workflow-registry/workflow-registry.module';

const CommandHandlers = [
  ApproveTaskHandler,
  RejectTaskHandler,
  CancelWorkflowHandler,
];

const QueryHandlers = [
  GetPendingTasksHandler,
  GetActiveWorkflowsHandler,
  GetWorkflowInstanceHandler,
  GetTaskReviewHandler,
];

@Module({
  imports: [CqrsModule, WorkflowRegistryModule],
  controllers: [ApprovalController, WorkflowController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    KogitoEventService,
    KogitoApiService,
  ],
})
export class ApprovalModule {}
