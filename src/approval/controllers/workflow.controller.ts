import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { CancelWorkflowCommand } from '../commands/cancel-workflow.command';
import { GetWorkflowInstanceQuery } from '../queries/get-workflow-instance.query';
import { GetPendingTasksQuery } from '../queries/get-pending-tasks.query';
import { WorkflowInstanceResponseDto } from '../dtos/workflow-instance-response.dto';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';

class CancelWorkflowDto {
  @ApiProperty({ description: 'ID of the user cancelling the workflow' })
  @IsString()
  @IsNotEmpty()
  cancelledById!: string;

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
  @ApiOperation({ summary: 'List all workflow instances' })
  @ApiResponse({ status: 200, type: [PendingTaskResponseDto] })
  listWorkflows() {
    return this.queryBus.execute(new GetPendingTasksQuery());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow instance detail' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  @ApiResponse({ status: 200, type: WorkflowInstanceResponseDto })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  getWorkflowInstance(@Param('id') id: string) {
    return this.queryBus.execute(new GetWorkflowInstanceQuery(id));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel/abort a workflow instance' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  @ApiBody({ type: CancelWorkflowDto })
  @ApiResponse({ status: 200, description: 'Workflow cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({ status: 409, description: 'Workflow instance is already completed or aborted' })
  cancelWorkflow(
    @Param('id') id: string,
    @Body() dto: CancelWorkflowDto,
  ) {
    return this.commandBus.execute(
      new CancelWorkflowCommand(id, dto.cancelledById, dto.reason),
    );
  }
}
