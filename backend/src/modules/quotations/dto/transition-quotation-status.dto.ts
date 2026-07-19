import { IsEnum, IsNotEmpty } from 'class-validator';
import { QuotationStatus } from '@prisma/client';

export class TransitionQuotationStatusDto {
  @IsNotEmpty()
  @IsEnum(QuotationStatus)
  status!: QuotationStatus;
}
