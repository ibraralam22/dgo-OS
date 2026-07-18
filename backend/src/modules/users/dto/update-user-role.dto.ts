import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'TenantAdmin' })
  @IsString()
  @IsNotEmpty()
  roleName!: string;
}
