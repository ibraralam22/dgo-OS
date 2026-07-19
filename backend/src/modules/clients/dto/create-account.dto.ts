import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { AccountStatus } from '@prisma/client';

export class CreateAccountDto {
  @ApiPropertyOptional({ example: 'uuid-parent-123' })
  @IsOptional()
  @IsUUID()
  parentAccountId?: string;

  @ApiProperty({ example: 'ACME Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'acme.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsInt()
  @Min(0)
  employeeCount?: number;

  @ApiPropertyOptional({ example: 5000000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualRevenue?: number;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingStreet?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingCity?: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  billingCountry!: string;

  @ApiPropertyOptional({ enum: AccountStatus, default: AccountStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus = AccountStatus.ACTIVE;
}
