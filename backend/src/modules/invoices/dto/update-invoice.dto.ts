import {
  IsString,
  IsUUID,
  IsISO8601,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceLineItemDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'UUID of client Account' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Issue date (ISO 8601 date string)' })
  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601 date string)' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Tax percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercentage?: number;

  @ApiPropertyOptional({ description: 'Optional notes or memo' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: 'Optional linked opportunity UUID' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({ description: 'Optional linked quotation UUID' })
  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @ApiPropertyOptional({ type: [InvoiceLineItemDto], description: 'Optional replacement line items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems?: InvoiceLineItemDto[];
}
