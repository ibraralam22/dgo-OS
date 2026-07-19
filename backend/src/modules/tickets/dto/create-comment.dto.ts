import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Text comment content' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  comment!: string;
}
