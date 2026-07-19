import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsIn,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TICKET_CATEGORIES = ['BILLING', 'TECHNICAL', 'GENERAL', 'ACCOUNT'] as const;

export class CreateTicketDto {
  @ApiProperty({ description: 'UUID of the client Account' })
  @IsNotEmpty()
  @IsUUID()
  accountId!: string;

  @ApiProperty({ description: 'Subject summary of the support ticket' })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Detailed explanation of the support case (min 10 chars)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, description: 'Severity priority' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ enum: TICKET_CATEGORIES, description: 'Billing, Technical, General, or Account category' })
  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: string;
}
