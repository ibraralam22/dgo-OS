import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@dgo.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: '+15550100' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ example: 'SalesRepresentative' })
  @IsString()
  @IsNotEmpty()
  roleName!: string;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsIn(['pending', 'active'], {
    message: 'status must be pending or active',
  })
  status?: string = 'active';

  @ApiProperty({ example: 'Secure@Password2026!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/, {
    message:
      'password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password!: string;
}
