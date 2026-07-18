import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLeadDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiPropertyOptional({ example: '+15550100' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName!: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiProperty({ example: 'website' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  source!: string;

  @ApiPropertyOptional({ example: 'new', default: 'new' })
  @IsOptional()
  @IsString()
  @IsIn(['new', 'contacted', 'qualified', 'nurturing', 'unqualified', 'converted'])
  status?: string = 'new';

  @ApiPropertyOptional({ example: 45, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number = 0;

  @ApiPropertyOptional({ example: 5000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ example: 'uuid-owner-123' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
