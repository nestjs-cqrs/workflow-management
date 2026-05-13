import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowRegistryService } from './workflow-registry.service';

@ApiTags('workflows')
@Controller('api/workflows')
export class WorkflowRegistryController {
  constructor(private readonly registryService: WorkflowRegistryService) {}

  @Get('registry')
  @ApiOperation({ summary: 'Get all registered workflow type configurations' })
  @ApiResponse({ status: 200, description: 'Workflow registry configurations' })
  getRegistry() {
    return { workflows: this.registryService.getAll() };
  }
}
