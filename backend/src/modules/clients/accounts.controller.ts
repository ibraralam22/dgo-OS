import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions('clients:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query paginated accounts/clients' })
  @ApiResponse({ status: 200, description: 'Accounts list successfully retrieved' })
  async getAccounts(
    @ActiveUser() activeUser: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.clientsService.getAccounts(
      orgId,
      Math.max(1, parseInt(page, 10)),
      Math.max(1, Math.min(100, parseInt(limit, 10))),
      search,
      status,
    );
  }

  @Get(':id')
  @RequirePermissions('clients:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch single account profile' })
  @ApiResponse({ status: 200, description: 'Account retrieved successfully' })
  async getAccountById(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.clientsService.getAccountById(id, orgId);
  }

  @Get(':id/hierarchy')
  @RequirePermissions('clients:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recursive subsidiaries and parent tree' })
  @ApiResponse({ status: 200, description: 'Account hierarchy tree retrieved successfully' })
  async getAccountHierarchy(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const hierarchy = await this.clientsService.getAccountHierarchy(id, orgId);
    return { success: true, hierarchy };
  }

  @Post()
  @RequirePermissions('clients:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account/client' })
  @ApiResponse({ status: 201, description: 'Account successfully created' })
  async createAccount(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: CreateAccountDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.createAccount(dto, orgId, actorId);
  }

  @Put(':id')
  @RequirePermissions('clients:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify parameters of an existing account' })
  @ApiResponse({ status: 200, description: 'Account successfully updated' })
  async updateAccount(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.updateAccount(id, dto, orgId, actorId);
  }

  @Delete(':id')
  @RequirePermissions('clients:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an existing account' })
  @ApiResponse({ status: 200, description: 'Account successfully soft deleted' })
  async deleteAccount(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.deleteAccount(id, orgId, actorId);
  }
}
