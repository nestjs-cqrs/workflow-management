import { ApiProperty } from '@nestjs/swagger';
import { WorkflowTypeConfig } from '../../workflow-registry/workflow-registry.config';

export class TimelineNodeDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  enter!: string;

  @ApiProperty({ required: false })
  exit?: string;
}

export class TimelineStepDto {
  @ApiProperty()
  stepNumber!: number;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['completed', 'active', 'pending'] })
  status!: 'completed' | 'active' | 'pending';

  @ApiProperty({ required: false })
  enterTime?: string;

  @ApiProperty({ required: false })
  exitTime?: string;

  @ApiProperty({ required: false })
  durationMs?: number;

  @ApiProperty({ required: false })
  detail?: string;

  @ApiProperty({ required: false })
  feedback?: string;

  @ApiProperty({ type: [TimelineNodeDto] })
  nodes!: TimelineNodeDto[];
}

export class TaskReviewTaskDto {
  @ApiProperty()
  processInstanceId!: string;

  @ApiProperty()
  processId!: string;

  @ApiProperty()
  currentState!: string;

  @ApiProperty()
  requiredRole!: string;

  @ApiProperty()
  stepNumber!: number;

  @ApiProperty()
  stepLabel!: string;

  @ApiProperty({ type: Object })
  variables!: Record<string, unknown>;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty({
    description: 'Whether the task is still actively waiting for approval',
  })
  isActive!: boolean;
}

export class TaskReviewResponseDto {
  @ApiProperty({ type: TaskReviewTaskDto })
  task!: TaskReviewTaskDto;

  @ApiProperty({ type: [TimelineStepDto] })
  timeline!: TimelineStepDto[];

  @ApiProperty({ required: false })
  workflowConfig?: WorkflowTypeConfig;
}
