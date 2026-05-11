import { ApiProperty } from '@nestjs/swagger';

export class NodeInstanceDto {
  @ApiProperty({ description: 'Node name' })
  name!: string;

  @ApiProperty({ description: 'Node type' })
  type!: string;

  @ApiProperty({ description: 'When the node was entered' })
  enter!: string;

  @ApiProperty({ description: 'When the node was exited', nullable: true })
  exit?: string;
}

export class WorkflowInstanceResponseDto {
  @ApiProperty({ description: 'Kogito process instance ID' })
  id!: string;

  @ApiProperty({ description: 'Kogito process definition ID' })
  processId!: string;

  @ApiProperty({
    description: 'ACTIVE, COMPLETED, ABORTED, SUSPENDED, PENDING, ERROR',
  })
  state!: string;

  @ApiProperty({ description: 'Workflow variables', type: Object })
  variables!: Record<string, unknown>;

  @ApiProperty({
    description: 'Node execution history',
    type: [NodeInstanceDto],
  })
  nodes!: NodeInstanceDto[];

  @ApiProperty({ description: 'When the workflow instance started' })
  start!: string;

  @ApiProperty({
    description: 'When the workflow instance ended',
    nullable: true,
  })
  end?: string;
}
