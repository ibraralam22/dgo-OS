import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsISO8601,
  IsIn,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TASK_ENTITY_TYPES = ['lead', 'account', 'opportunity', 'project'] as const;

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Detailed description of the task' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 due date for the task' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TASK_ENTITY_TYPES, description: 'Type of entity this task is linked to' })
  @IsOptional()
  @IsIn(TASK_ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional({ description: 'UUID of the linked entity — required when entityType is set' })
  @ValidateIf((o) => !!o.entityType)
  @IsNotEmpty({ message: 'entityId is required when entityType is provided' })
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'UUID of the user this task is assigned to' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
