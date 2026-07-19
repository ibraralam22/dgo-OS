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
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions('clients:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query paginated stakeholder contacts' })
  @ApiResponse({ status: 200, description: 'Contacts list successfully retrieved' })
  async getContacts(
    @ActiveUser() activeUser: ActiveUserData,
    @Query('accountId') accountId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.clientsService.getContacts(
      orgId,
      accountId,
      Math.max(1, parseInt(page, 10)),
      Math.max(1, Math.min(100, parseInt(limit, 10))),
      search,
    );
  }

  @Get(':id')
  @RequirePermissions('clients:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch single contact stakeholder' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  async getContactById(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.clientsService.getContactById(id, orgId);
  }

  @Post()
  @RequirePermissions('clients:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new stakeholder contact' })
  @ApiResponse({ status: 201, description: 'Contact successfully created' })
  async createContact(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: CreateContactDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.createContact(dto, orgId, actorId);
  }

  @Put(':id')
  @RequirePermissions('clients:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify parameters of an existing contact' })
  @ApiResponse({ status: 200, description: 'Contact successfully updated' })
  async updateContact(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.updateContact(id, dto, orgId, actorId);
  }

  @Put(':id/primary')
  @RequirePermissions('clients:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Designate contact as primary billing point of contact' })
  @ApiResponse({ status: 200, description: 'Primary contact successfully set' })
  async setPrimaryBillingContact(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.setPrimaryBillingContact(id, orgId, actorId);
  }

  @Delete(':id')
  @RequirePermissions('clients:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete stakeholder contact' })
  @ApiResponse({ status: 200, description: 'Contact successfully soft deleted' })
  async deleteContact(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.clientsService.deleteContact(id, orgId, actorId);
  }
}
