import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterSuperAdminDto {
  @ApiProperty({
    example: 'SUPERADMIN_SECRET_KEY_123',
    description: 'Secret registration key configured in environment variables',
  })
  @IsString({ message: 'Secret key must be a string' })
  @IsNotEmpty({ message: 'Secret key is required' })
  secretKey!: string;

  @ApiProperty({
    example: 'superadmin@dgo.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User login password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password!: string;

  @ApiProperty({
    example: 'Super',
    description: 'First name',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @ApiProperty({
    example: 'Admin',
    description: 'Last name',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;
}
