import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as express from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('iam:read')
  @ApiOperation({ summary: 'List all users in the active organization with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'active', 'suspended'] })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated user list returned successfully' })
  async listUsers(
    @ActiveUser() activeUser: ActiveUserData,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    const orgId = activeUser.organizationId!;
    const result = await this.usersService.listUsers(
      orgId,
      page ?? 1,
      limit ?? 10,
      search,
      status,
      role,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user profile within the active organization' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 404, description: 'User not found in organization' })
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() activeUser: ActiveUserData,
  ) {
    const hasIamRead = activeUser.permissions.includes('iam:read');
    const data = await this.usersService.getUser(
      id,
      activeUser.organizationId!,
      activeUser.id,
      hasIamRead,
    );
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('iam:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user and associate with the active organization' })
  @ApiResponse({ status: 201, description: 'User created and associated successfully' })
  @ApiResponse({ status: 400, description: 'User already exists in organization' })
  async createUser(
    @Body() dto: CreateUserDto,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    const data = await this.usersService.createUser(
      dto,
      activeUser.organizationId!,
      activeUser.id,
      req.ip,
    );
    return {
      success: true,
      message: 'User created and associated with organization successfully.',
      data,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user profile. Self-update allowed; others require iam:write.' })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    const hasIamWrite = activeUser.permissions.includes('iam:write');
    const data = await this.usersService.updateUser(
      id,
      dto,
      activeUser.organizationId!,
      activeUser.id,
      hasIamWrite,
      req.ip,
    );
    return { success: true, data };
  }

  @Put(':id/role')
  @RequirePermissions('iam:write')
  @ApiOperation({ summary: 'Update the role of a user within the active organization' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    return this.usersService.updateUserRole(
      id,
      dto,
      activeUser.organizationId!,
      activeUser.id,
      req.ip,
    );
  }

  @Delete(':id')
  @RequirePermissions('iam:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a user from the active organization' })
  @ApiResponse({ status: 200, description: 'User membership removed' })
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() activeUser: ActiveUserData,
    @Req() req: express.Request,
  ) {
    return this.usersService.removeUser(
      id,
      activeUser.organizationId!,
      activeUser.id,
      req.ip,
    );
  }
}
