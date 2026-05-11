import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ApproveTaskCommand } from '../commands/approve-task.command';
import { RejectTaskCommand } from '../commands/reject-task.command';
import { GetPendingTasksQuery } from '../queries/get-pending-tasks.query';
import { ApproveTaskDto } from '../dtos/approve-task.dto';
import { RejectTaskDto } from '../dtos/reject-task.dto';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';

@ApiTags('approvals')
@Controller('api/approvals')
export class ApprovalController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending approval tasks' })
  @ApiQuery({
    name: 'app',
    required: false,
    description: 'Filter by source application (process definition ID)',
  })
  @ApiResponse({ status: 200, type: [PendingTaskResponseDto] })
  getPendingTasks(@Query('app') app?: string) {
    return this.queryBus.execute(new GetPendingTasksQuery(app));
  }

  @Post(':workflowInstanceId/approve')
  @ApiOperation({ summary: 'Approve a pending task' })
  @ApiParam({ name: 'workflowInstanceId', description: 'Workflow instance ID' })
  @ApiResponse({ status: 200, description: 'Task approved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({ status: 409, description: 'Workflow instance is not in a pending state' })
  approveTask(
    @Param('workflowInstanceId') workflowInstanceId: string,
    @Body() dto: ApproveTaskDto,
  ) {
    return this.commandBus.execute(
      new ApproveTaskCommand(
        workflowInstanceId,
        dto.approvedById,
        dto.role,
        dto.comment,
      ),
    );
  }

  @Post(':workflowInstanceId/reject')
  @ApiOperation({ summary: 'Reject a pending task with feedback' })
  @ApiParam({ name: 'workflowInstanceId', description: 'Workflow instance ID' })
  @ApiResponse({ status: 200, description: 'Task rejected successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({ status: 409, description: 'Workflow instance is not in a pending state' })
  rejectTask(
    @Param('workflowInstanceId') workflowInstanceId: string,
    @Body() dto: RejectTaskDto,
  ) {
    return this.commandBus.execute(
      new RejectTaskCommand(
        workflowInstanceId,
        dto.rejectedById,
        dto.role,
        dto.feedback,
      ),
    );
  }
}
