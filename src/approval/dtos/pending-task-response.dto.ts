import { ApiProperty } from '@nestjs/swagger';

export class PendingTaskResponseDto {
  @ApiProperty({ description: 'Kogito process instance ID' })
  processInstanceId!: string;

  @ApiProperty({ description: 'Kogito process definition ID' })
  processId!: string;

  @ApiProperty({
    description: 'Current workflow state name, e.g. WaitApprovalStep3_BA',
  })
  currentState!: string;

  @ApiProperty({
    description: 'Required role for this approval (e.g. pm, ba)',
  })
  requiredRole!: string;

  @ApiProperty({
    description: 'Workflow variables including pipelineRunId, projectId etc.',
    type: Object,
  })
  variables!: Record<string, unknown>;

  @ApiProperty({ description: 'When the workflow instance started' })
  startedAt!: string;
}
