import { IsNotEmpty, IsString, IsInt, IsNumber, Min, IsOptional, MaxLength } from 'class-validator';

export class CreateQuoteLineItemDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  itemName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice: number;
}
