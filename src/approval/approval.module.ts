import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApprovalController } from './controllers/approval.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { FilesController } from './controllers/files.controller';
import { ApproveTaskHandler } from './commands/approve-task.handler';
import { RejectTaskHandler } from './commands/reject-task.handler';
import { CancelWorkflowHandler } from './commands/cancel-workflow.handler';
import { SaveFileHandler } from './commands/save-file.handler';
import { GetPendingTasksHandler } from './queries/get-pending-tasks.handler';
import { GetActiveWorkflowsHandler } from './queries/get-active-workflows.handler';
import { GetWorkflowInstanceHandler } from './queries/get-workflow-instance.handler';
import { GetTaskReviewHandler } from './queries/get-task-review.handler';
import { GetStepOutputHandler } from './queries/get-step-output.handler';
import { GetFileHandler } from './queries/get-file.handler';
import { GetFileVersionsHandler } from './queries/get-file-versions.handler';
import { GetFileVersionHandler } from './queries/get-file-version.handler';
import { KogitoEventService } from './services/kogito-event.service';
import { KogitoApiService } from './services/kogito-api.service';
import { MinioStorageService } from './services/minio-storage.service';
import { WorkflowRegistryModule } from '../workflow-registry/workflow-registry.module';

const CommandHandlers = [
  ApproveTaskHandler,
  RejectTaskHandler,
  CancelWorkflowHandler,
  SaveFileHandler,
];

const QueryHandlers = [
  GetPendingTasksHandler,
  GetActiveWorkflowsHandler,
  GetWorkflowInstanceHandler,
  GetTaskReviewHandler,
  GetStepOutputHandler,
  GetFileHandler,
  GetFileVersionsHandler,
  GetFileVersionHandler,
];

@Module({
  imports: [CqrsModule, WorkflowRegistryModule],
  controllers: [ApprovalController, WorkflowController, FilesController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    KogitoEventService,
    KogitoApiService,
    MinioStorageService,
  ],
})
export class ApprovalModule {}
