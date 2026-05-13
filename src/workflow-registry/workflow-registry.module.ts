import { Module } from '@nestjs/common';
import { WorkflowRegistryService } from './workflow-registry.service';
import { WorkflowRegistryController } from './workflow-registry.controller';

@Module({
  controllers: [WorkflowRegistryController],
  providers: [WorkflowRegistryService],
  exports: [WorkflowRegistryService],
})
export class WorkflowRegistryModule {}
