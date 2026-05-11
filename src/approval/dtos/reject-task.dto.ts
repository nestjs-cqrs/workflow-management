import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectTaskDto {
  @ApiProperty({ description: 'Kogito process definition ID' })
  @IsString()
  @IsNotEmpty()
  processId!: string;

  @ApiProperty({ description: 'Feedback explaining the reason for rejection' })
  @IsString()
  @IsNotEmpty()
  feedback!: string;
}
