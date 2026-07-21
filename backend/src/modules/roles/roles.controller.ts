import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as express from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { RolesService, RoleListItem } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('iam:read')
  @ApiOperation({ summary: 'List all roles visible to the active organization' })
  @ApiResponse({ status: 200, description: 'Role list returned successfully' })
  async listRoles(@ActiveUser() activeUser: ActiveUserData): Promise<{ success: boolean; data: RoleListItem[] }> {
    const data = await this.rolesService.listRoles(activeUser.organizationId!);
    return { success: true, data };
  }

  @Get('permissions')
  @RequirePermissions('iam:read')
  @ApiOperation({ summary: 'List all available functional permissions in the system' })
  @ApiResponse({ status: 200, description: 'Permission list returned' })
  async getPermissions() {
    const data = await this.rolesService.getPermissions();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('iam:read')
  @ApiOperation({ summary: 'Get details of a specific role by ID' })
  @ApiResponse({ status: 200, description: 'Role profile returned' })
  @ApiResponse({ status: 404, description: 'Role not found or access denied' })
  async getRole(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() activeUser: ActiveUserData,
  ) {
    const data = await this.rolesService.getRole(id, activeUser.organizationId!);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('iam:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role for the active organization' })
  @ApiResponse({ status: 201, description: 'Custom role created successfully' })
  @ApiResponse({ status: 400, description: 'Role name conflicts or validation error' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    const data = await this.rolesService.createRole(
      dto,
      activeUser.organizationId!,
      activeUser.id,
      req.ip,
    );
    return {
      success: true,
      message: 'Custom role created successfully.',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('iam:write')
  @ApiOperation({ summary: 'Update a custom role inside the active organization' })
  @ApiResponse({ status: 200, description: 'Custom role updated successfully' })
  @ApiResponse({ status: 403, description: 'Modifying system roles is blocked' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    const data = await this.rolesService.updateRole(
      id,
      dto,
      activeUser.organizationId!,
      activeUser.id,
      req.ip,
    );
    return {
      success: true,
      message: 'Custom role updated successfully.',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('iam:write')
  @ApiOperation({ summary: 'Delete a custom role from the active organization' })
  @ApiResponse({ status: 200, description: 'Custom role deleted' })
  @ApiResponse({ status: 400, description: 'Role is currently assigned to users' })
  @ApiResponse({ status: 403, description: 'Deleting system roles is blocked' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    return this.rolesService.deleteRole(
      id,
      activeUser.organizationId!,
      activeUser.id,
      req.ip,
    );
  }
}
