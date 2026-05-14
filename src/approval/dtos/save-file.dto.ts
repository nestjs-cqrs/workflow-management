import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SaveFileDto {
  @ApiProperty({ description: 'Markdown file content' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
