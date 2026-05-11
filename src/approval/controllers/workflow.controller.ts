import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsString, IsOptional } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiProperty,
  ApiQuery,
} from '@nestjs/swagger';
import { CancelWorkflowCommand } from '../commands/cancel-workflow.command';
import { GetWorkflowInstanceQuery } from '../queries/get-workflow-instance.query';
import { GetPendingTasksQuery } from '../queries/get-pending-tasks.query';
import { WorkflowInstanceResponseDto } from '../dtos/workflow-instance-response.dto';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../bff/decorators/current-user.decorator';

class CancelWorkflowDto {
  @ApiProperty({ description: 'Reason for cancellation', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

@ApiTags('workflows')
@Controller('api/workflows')
export class WorkflowController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active workflow instances' })
  @ApiQuery({
    name: 'app',
    required: false,
    description: 'Filter by process definition ID',
  })
  @ApiResponse({ status: 200, type: [PendingTaskResponseDto] })
  listWorkflows(
    @CurrentUser() user: AuthenticatedUser,
    @Query('app') app?: string,
  ) {
    return this.queryBus.execute(new GetPendingTasksQuery(user.roles, app));
  }

  @Get(':processId/:instanceId')
  @ApiOperation({ summary: 'Get workflow instance detail from Kogito' })
  @ApiParam({
    name: 'processId',
    description: 'Kogito process definition ID',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Kogito process instance ID',
  })
  @ApiResponse({ status: 200, type: WorkflowInstanceResponseDto })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  getWorkflowInstance(
    @Param('processId') processId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.queryBus.execute(
      new GetWorkflowInstanceQuery(processId, instanceId),
    );
  }

  @Post(':processId/:instanceId/cancel')
  @ApiOperation({ summary: 'Cancel/abort a workflow instance' })
  @ApiParam({
    name: 'processId',
    description: 'Kogito process definition ID',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Kogito process instance ID',
  })
  @ApiBody({ type: CancelWorkflowDto })
  @ApiResponse({ status: 200, description: 'Workflow cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({
    status: 409,
    description: 'Workflow instance is already completed or aborted',
  })
  cancelWorkflow(
    @Param('processId') processId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: CancelWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new CancelWorkflowCommand(
        instanceId,
        processId,
        user.keycloakId,
        dto.reason,
      ),
    );
  }
}
