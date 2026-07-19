import {
  IsNotEmpty,
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceLineItemDto {
  @ApiProperty({ description: 'Name of the line item' })
  @IsNotEmpty()
  @IsString()
  itemName!: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quantity (must be at least 1)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Unit price of the item (must be at least 0)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'UUID of client Account' })
  @IsNotEmpty()
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({ description: 'Invoice number. If omitted, will be auto-generated' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ description: 'Issue date (ISO 8601 date string)' })
  @IsNotEmpty()
  @IsISO8601()
  issueDate!: string;

  @ApiProperty({ description: 'Due date (ISO 8601 date string)' })
  @IsNotEmpty()
  @IsISO8601()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Currency code, default: USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Discount percentage, default: 0.00' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Tax percentage, default: 0.00' })
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

  @ApiProperty({ type: [InvoiceLineItemDto], description: 'At least one line item is required' })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems!: InvoiceLineItemDto[];
}
