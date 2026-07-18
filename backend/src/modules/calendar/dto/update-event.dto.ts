import { IsOptional, IsString, MaxLength, IsISO8601, IsIn, IsUUID, ValidateIf, IsBoolean, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EVENT_TYPES, RECURRENCE_FREQUENCIES, EVENT_ENTITY_TYPES } from './create-event.dto';

export class UpdateEventDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: EVENT_TYPES })
  @IsOptional()
  @IsIn(EVENT_TYPES)
  type?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 start datetime' })
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end datetime' })
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ enum: RECURRENCE_FREQUENCIES })
  @IsOptional()
  @IsIn(RECURRENCE_FREQUENCIES)
  recurrence?: string;

  @ApiPropertyOptional({ enum: EVENT_ENTITY_TYPES })
  @IsOptional()
  @IsIn(EVENT_ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => !!o.entityType)
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
