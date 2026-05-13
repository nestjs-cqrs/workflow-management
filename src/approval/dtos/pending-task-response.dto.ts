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

  @ApiProperty({ description: 'Parsed step number from approval node name' })
  stepNumber!: number;

  @ApiProperty({ description: 'Human-readable step label from registry or fallback' })
  stepLabel!: string;

  @ApiProperty({ description: 'Workflow display name from registry or processId fallback' })
  workflowDisplayName!: string;

  @ApiProperty({ description: 'Registry-configured highlighted variable values', type: Object })
  highlightedVariables!: Record<string, string>;

  @ApiProperty({ description: 'Total node count indicating workflow progress' })
  nodeCount!: number;
}
