import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const REPORT_CATEGORIES = ['SALES', 'FINANCIAL', 'SUPPORT'] as const;

export class CreateSavedReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional explanation of the report view context' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: REPORT_CATEGORIES, description: 'Sales, Financial, or Support Desk category' })
  @IsNotEmpty()
  @IsIn(REPORT_CATEGORIES)
  category!: string;

  @ApiProperty({ description: 'JSON configuration parameters' })
  @IsNotEmpty()
  @IsObject()
  config!: Record<string, any>;
}
