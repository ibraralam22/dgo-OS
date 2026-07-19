import { IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TICKET_PRIORITIES, TICKET_CATEGORIES } from './create-ticket.dto';

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES, description: 'Ticket state transition' })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, description: 'Severity priority' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ enum: TICKET_CATEGORIES, description: 'Billing, Technical, General, or Account category' })
  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ description: 'Optional assigned support user UUID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
