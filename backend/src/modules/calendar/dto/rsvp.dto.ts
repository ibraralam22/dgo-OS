import { IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const RSVP_STATUSES = ['ACCEPTED', 'DECLINED'] as const;

export class RsvpDto {
  @ApiProperty({ enum: RSVP_STATUSES, description: 'RSVP response to an event invite' })
  @IsNotEmpty()
  @IsIn(RSVP_STATUSES)
  status!: string;
}
