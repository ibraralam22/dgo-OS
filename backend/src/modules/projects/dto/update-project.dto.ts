import { IsOptional, IsString, MaxLength, IsIn, IsUUID, IsISO8601 } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IN_PROGRESS', 'SUSPENDED', 'COMPLETED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  templateType?: string;

  @IsOptional()
  @IsISO8601()
  targetStartDate?: string;

  @IsOptional()
  @IsUUID()
  assignedManagerId?: string;
}
