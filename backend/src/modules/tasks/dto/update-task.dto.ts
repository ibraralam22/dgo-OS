import { IsOptional, IsString, MaxLength, IsISO8601, IsIn, IsUUID, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TASK_STATUSES, TASK_PRIORITIES, TASK_ENTITY_TYPES } from './create-task.dto';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the task' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 due date' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TASK_ENTITY_TYPES })
  @IsOptional()
  @IsIn(TASK_ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional({ description: 'UUID of linked entity' })
  @ValidateIf((o) => !!o.entityType)
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'UUID of assignee' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;
}
