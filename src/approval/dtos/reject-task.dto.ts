import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectTaskDto {
  @ApiProperty({ description: 'ID of the user rejecting the task' })
  @IsString()
  @IsNotEmpty()
  rejectedById!: string;

  @ApiProperty({ description: 'Role of the rejecting user' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiProperty({ description: 'Feedback explaining the reason for rejection' })
  @IsString()
  @IsNotEmpty()
  feedback!: string;
}
