import { IsNotEmpty, IsUUID, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuoteLineItemDto } from './create-quote-line-item.dto';

export class CreateQuotationDto {
  @IsNotEmpty()
  @IsUUID()
  opportunityId!: string;

  @IsNotEmpty()
  @IsISO8601()
  expiresAt!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercentage?: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems!: CreateQuoteLineItemDto[];
}
