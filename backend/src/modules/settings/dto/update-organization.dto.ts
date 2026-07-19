import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({ description: 'Organization display name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Organization central support phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Organization headquarters address details' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Organization base currency' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrency?: string;

  @ApiPropertyOptional({ description: 'Organization standard operating timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
