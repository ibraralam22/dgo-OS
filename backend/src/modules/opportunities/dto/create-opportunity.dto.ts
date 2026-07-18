import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  IsISO8601,
} from 'class-validator';

export class CreateOpportunityDto {
  @ApiProperty({ example: 'ACME - 10 Java Devs Squad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '77ccaa89-2287-43eb-8e99-dbad4f18bc55' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional({ example: '87ffbb12-bbff-4b4b-aa22-dbcd990022ff' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiProperty({ example: 120000.0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  @IsISO8601()
  @IsNotEmpty()
  closeDate!: string;

  @ApiPropertyOptional({ example: 'Long-term staffing agreement for backend development squad.' })
  @IsOptional()
  @IsString()
  description?: string;
}
