import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContactRole, ContactStatus } from '@prisma/client';

export class CreateContactDto {
  @ApiProperty({ example: 'uuid-account-123' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

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

  @ApiPropertyOptional({ example: 'CTO' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ enum: ContactRole, default: ContactRole.USER })
  @IsOptional()
  @IsEnum(ContactRole)
  roleScope?: ContactRole = ContactRole.USER;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryBilling?: boolean = false;

  @ApiPropertyOptional({ enum: ContactStatus, default: ContactStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus = ContactStatus.ACTIVE;
}
