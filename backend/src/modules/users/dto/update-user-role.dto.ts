import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'TenantAdmin' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['TenantAdmin', 'SalesRepresentative', 'ClientContact'], {
    message: 'roleName must be a valid assignable system role',
  })
  roleName!: string;
}
