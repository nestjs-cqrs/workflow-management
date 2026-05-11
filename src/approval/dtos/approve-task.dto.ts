import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApproveTaskDto {
  @ApiProperty({ description: 'Kogito process definition ID' })
  @IsString()
  @IsNotEmpty()
  processId!: string;

  @ApiProperty({
    description: 'Optional comment for the approval',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
