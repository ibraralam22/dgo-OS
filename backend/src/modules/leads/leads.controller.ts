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
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermissions('leads:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query paginated leads inside active organization' })
  @ApiResponse({ status: 200, description: 'Leads list successfully retrieved' })
  async listLeads(
    @ActiveUser() activeUser: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.leadsService.listLeads(orgId, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      search,
      status,
    });
  }

  @Get(':id')
  @RequirePermissions('leads:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch single lead record details' })
  @ApiResponse({ status: 200, description: 'Lead record retrieved successfully' })
  async getLead(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.leadsService.getLead(id, orgId);
  }

  @Post()
  @RequirePermissions('leads:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new lead inside active organization' })
  @ApiResponse({ status: 201, description: 'Lead successfully created' })
  async createLead(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: CreateLeadDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.leadsService.createLead(dto, orgId, actorId);
  }

  @Put(':id')
  @RequirePermissions('leads:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify parameters of an existing lead' })
  @ApiResponse({ status: 200, description: 'Lead successfully updated' })
  async updateLead(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.leadsService.updateLead(id, dto, orgId, actorId);
  }

  @Post(':id/convert')
  @RequirePermissions('leads:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lead status as qualified/converted' })
  @ApiResponse({ status: 200, description: 'Lead successfully converted' })
  async convertLead(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.leadsService.convertLead(id, orgId, actorId);
  }

  @Delete(':id')
  @RequirePermissions('leads:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an existing lead record' })
  @ApiResponse({ status: 200, description: 'Lead successfully soft deleted' })
  async deleteLead(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.leadsService.deleteLead(id, orgId, actorId);
  }
}
