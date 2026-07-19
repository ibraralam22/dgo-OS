import { IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ALLOWED_PATCH_STATUSES = ['SENT', 'VOID', 'OVERDUE'] as const;

export class PatchInvoiceStatusDto {
  @ApiProperty({ enum: ALLOWED_PATCH_STATUSES, description: 'New invoice status' })
  @IsNotEmpty()
  @IsIn(ALLOWED_PATCH_STATUSES)
  status!: string;
}
