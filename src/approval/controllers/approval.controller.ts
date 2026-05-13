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
import { GetTaskReviewQuery } from '../queries/get-task-review.query';
import { ApproveTaskDto } from '../dtos/approve-task.dto';
import { RejectTaskDto } from '../dtos/reject-task.dto';
import { PendingTaskResponseDto } from '../dtos/pending-task-response.dto';
import { TaskReviewResponseDto } from '../dtos/task-review-response.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../bff/decorators/current-user.decorator';

@ApiTags('approvals')
@Controller('api/approvals')
export class ApprovalController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending approval tasks for the current user' })
  @ApiQuery({
    name: 'app',
    required: false,
    description: 'Filter by process definition ID',
  })
  @ApiResponse({ status: 200, type: [PendingTaskResponseDto] })
  getPendingTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query('app') app?: string,
  ) {
    return this.queryBus.execute(new GetPendingTasksQuery(user.roles, app));
  }

  @Get(':processInstanceId/review')
  @ApiOperation({ summary: 'Get full context for task review page' })
  @ApiParam({
    name: 'processInstanceId',
    description: 'Kogito process instance ID',
  })
  @ApiQuery({
    name: 'processId',
    required: true,
    description: 'Kogito process definition ID',
  })
  @ApiResponse({ status: 200, type: TaskReviewResponseDto })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  getTaskReview(
    @Param('processInstanceId') processInstanceId: string,
    @Query('processId') processId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queryBus.execute(
      new GetTaskReviewQuery(processInstanceId, processId, user.roles),
    );
  }

  @Post(':processInstanceId/approve')
  @ApiOperation({ summary: 'Approve a pending task' })
  @ApiParam({
    name: 'processInstanceId',
    description: 'Kogito process instance ID',
  })
  @ApiResponse({ status: 200, description: 'Task approved successfully' })
  @ApiResponse({ status: 403, description: 'User does not have the required role' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({
    status: 409,
    description: 'No pending approval or workflow not active',
  })
  approveTask(
    @Param('processInstanceId') processInstanceId: string,
    @Body() dto: ApproveTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new ApproveTaskCommand(
        processInstanceId,
        dto.processId,
        user.keycloakId,
        user.roles,
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
  @ApiResponse({ status: 403, description: 'User does not have the required role' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiResponse({
    status: 409,
    description: 'No pending approval or workflow not active',
  })
  rejectTask(
    @Param('processInstanceId') processInstanceId: string,
    @Body() dto: RejectTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new RejectTaskCommand(
        processInstanceId,
        dto.processId,
        user.keycloakId,
        user.roles,
        dto.feedback,
      ),
    );
  }
}
