import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApproveTaskDto {
  @ApiProperty({ description: 'Kogito process definition ID' })
  @IsString()
  @IsNotEmpty()
  processId!: string;

  @ApiProperty({ description: 'ID of the user approving the task' })
  @IsString()
  @IsNotEmpty()
  approvedById!: string;

  @ApiProperty({ description: 'Role of the approving user' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiProperty({
    description: 'Optional comment for the approval',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
