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
    description: 'Filter by process definition ID',
  })
  @ApiResponse({ status: 200, type: [PendingTaskResponseDto] })
  getPendingTasks(@Query('app') app?: string) {
    return this.queryBus.execute(new GetPendingTasksQuery(app));
  }

  @Post(':processInstanceId/approve')
  @ApiOperation({ summary: 'Approve a pending task' })
  @ApiParam({
    name: 'processInstanceId',
    description: 'Kogito process instance ID',
  })
  @ApiResponse({ status: 200, description: 'Task approved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({
    status: 409,
    description: 'Workflow instance is not in an active state',
  })
  approveTask(
    @Param('processInstanceId') processInstanceId: string,
    @Body() dto: ApproveTaskDto,
  ) {
    return this.commandBus.execute(
      new ApproveTaskCommand(
        processInstanceId,
        dto.processId,
        dto.approvedById,
        dto.role,
        dto.comment,
      ),
    );
  }

  @Post(':processInstanceId/reject')
  @ApiOperation({ summary: 'Reject a pending task with feedback' })
  @ApiParam({
    name: 'processInstanceId',
    description: 'Kogito process instance ID',
  })
  @ApiResponse({ status: 200, description: 'Task rejected successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({
    status: 409,
    description: 'Workflow instance is not in an active state',
  })
  rejectTask(
    @Param('processInstanceId') processInstanceId: string,
    @Body() dto: RejectTaskDto,
  ) {
    return this.commandBus.execute(
      new RejectTaskCommand(
        processInstanceId,
        dto.processId,
        dto.rejectedById,
        dto.role,
        dto.feedback,
      ),
    );
  }
}
