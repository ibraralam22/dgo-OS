import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({ example: 'Marketing Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @ApiPropertyOptional({ example: 'Manages marketing operations and leads assignment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: ['leads:read', 'leads:write'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes!: string[];
}
