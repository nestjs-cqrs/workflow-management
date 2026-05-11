import { ApiProperty } from '@nestjs/swagger';
import { WorkflowStatus } from '@turkelk/nestjs-cqrs-workflow';

export class WorkflowInstanceResponseDto {
  @ApiProperty({ description: 'Workflow instance ID' })
  id!: string;

  @ApiProperty({ description: 'Kogito process definition ID' })
  processDefinitionId!: string;

  @ApiProperty({ description: 'Kogito process instance ID' })
  processInstanceId!: string;

  @ApiProperty({ description: 'Command type that initiated the workflow' })
  commandType!: string;

  @ApiProperty({ description: 'Original command payload', type: Object })
  commandPayload!: Record<string, unknown>;

  @ApiProperty({ description: 'Current workflow status', enum: WorkflowStatus })
  status!: WorkflowStatus;

  @ApiProperty({ description: 'Correlation ID for tracing' })
  correlationId!: string;

  @ApiProperty({ description: 'Process variables from Kogito', type: Object, nullable: true })
  processVariables!: Record<string, unknown> | null;

  @ApiProperty({ description: 'When the workflow was created' })
  createdAt!: Date;

  @ApiProperty({ description: 'When the workflow was last updated' })
  updatedAt!: Date;

  @ApiProperty({ description: 'When the workflow completed', nullable: true })
  completedAt!: Date | null;
}
