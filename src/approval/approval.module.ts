import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WorkflowInstance, KogitoClient } from '@turkelk/nestjs-cqrs-workflow';
import { ApprovalController } from './controllers/approval.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { ApproveTaskHandler } from './commands/approve-task.handler';
import { RejectTaskHandler } from './commands/reject-task.handler';
import { CancelWorkflowHandler } from './commands/cancel-workflow.handler';
import { GetPendingTasksHandler } from './queries/get-pending-tasks.handler';
import { GetWorkflowInstanceHandler } from './queries/get-workflow-instance.handler';
import { KogitoEventService } from './services/kogito-event.service';

const CommandHandlers = [
  ApproveTaskHandler,
  RejectTaskHandler,
  CancelWorkflowHandler,
];

const QueryHandlers = [GetPendingTasksHandler, GetWorkflowInstanceHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([WorkflowInstance]),
    HttpModule,
  ],
  controllers: [ApprovalController, WorkflowController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    KogitoEventService,
    KogitoClient,
  ],
})
export class ApprovalModule {}
