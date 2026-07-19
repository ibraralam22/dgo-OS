import { IsNotEmpty, IsString, MaxLength, IsOptional, IsISO8601 } from 'class-validator';

export class CreateMilestoneDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
