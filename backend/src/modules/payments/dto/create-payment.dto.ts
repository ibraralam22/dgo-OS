import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsISO8601,
  IsOptional,
  IsNumber,
  Min,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PAYMENT_METHODS = [
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'CHECK',
  'CASH',
  'STRIPE',
  'OTHER',
] as const;

export class CreatePaymentDto {
  @ApiProperty({ description: 'UUID of the linked Invoice' })
  @IsNotEmpty()
  @IsUUID()
  invoiceId!: string;

  @ApiProperty({ description: 'Payment amount (must be positive)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Date the payment was recorded (ISO 8601 date string)' })
  @IsNotEmpty()
  @IsISO8601()
  paymentDate!: string;

  @ApiProperty({ enum: PAYMENT_METHODS, description: 'Method of payment' })
  @IsNotEmpty()
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: string;

  @ApiPropertyOptional({ description: 'Optional reference transaction or check number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Internal payment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
