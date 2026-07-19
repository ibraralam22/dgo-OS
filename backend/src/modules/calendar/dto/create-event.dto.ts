import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsISO8601,
  IsIn,
  IsUUID,
  ValidateIf,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const EVENT_TYPES = ['MEETING', 'CALL', 'DEMO', 'FOLLOW_UP', 'DEADLINE', 'REMINDER', 'OTHER'] as const;
export const RECURRENCE_FREQUENCIES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export const EVENT_ENTITY_TYPES = ['lead', 'account', 'opportunity', 'project', 'task'] as const;

export class CreateEventDto {
  @ApiProperty({ description: 'Event title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ enum: EVENT_TYPES, description: 'Type of event' })
  @IsIn(EVENT_TYPES)
  type!: string;

  @ApiProperty({ description: 'ISO 8601 start datetime' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ description: 'ISO 8601 end datetime (must be after startAt)' })
  @IsISO8601()
  endAt!: string;

  @ApiPropertyOptional({ description: 'All-day event flag (hides time display)', default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Detailed description or agenda', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Physical or virtual location / meeting link', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ enum: RECURRENCE_FREQUENCIES, default: 'NONE' })
  @IsOptional()
  @IsIn(RECURRENCE_FREQUENCIES)
  recurrence?: string;

  @ApiPropertyOptional({ enum: EVENT_ENTITY_TYPES, description: 'Type of CRM entity linked to this event' })
  @IsOptional()
  @IsIn(EVENT_ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional({ description: 'UUID of the linked CRM entity — required when entityType is set' })
  @ValidateIf((o) => !!o.entityType)
  @IsNotEmpty({ message: 'entityId is required when entityType is provided' })
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Array of user UUIDs to invite as attendees', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  attendeeIds?: string[];
}
