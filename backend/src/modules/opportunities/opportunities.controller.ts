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
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { TransitionStageDto } from './dto/transition-stage.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OpportunityStage } from '@prisma/client';

@ApiTags('Opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @RequirePermissions('opportunities:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query paginated opportunities inside active organization' })
  @ApiResponse({ status: 200, description: 'Opportunities list successfully retrieved' })
  async listOpportunities(
    @ActiveUser() activeUser: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('stage') stage?: OpportunityStage,
    @Query('accountId') accountId?: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.opportunitiesService.listOpportunities(orgId, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      search,
      stage,
      accountId,
    });
  }

  @Get(':id')
  @RequirePermissions('opportunities:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch single opportunity record details' })
  @ApiResponse({ status: 200, description: 'Opportunity record retrieved successfully' })
  async getOpportunity(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.opportunitiesService.getOpportunity(id, orgId);
  }

  @Post()
  @RequirePermissions('opportunities:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new opportunity inside active organization' })
  @ApiResponse({ status: 201, description: 'Opportunity successfully created' })
  async createOpportunity(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: CreateOpportunityDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.opportunitiesService.createOpportunity(dto, orgId, actorId);
  }

  @Put(':id')
  @RequirePermissions('opportunities:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify parameters of an existing opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity successfully updated' })
  async updateOpportunity(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.opportunitiesService.updateOpportunity(id, dto, orgId, actorId);
  }

  @Put(':id/stage')
  @RequirePermissions('opportunities:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition stage and update probability scores automatically' })
  @ApiResponse({ status: 200, description: 'Opportunity stage successfully transitioned' })
  async transitionStage(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: TransitionStageDto,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    const userRole = activeUser.role;
    return this.opportunitiesService.transitionStage(id, dto, orgId, actorId, userRole);
  }

  @Post(':id/approve')
  @RequirePermissions('opportunities:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a high-value opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity successfully approved' })
  async approveOpportunity(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.opportunitiesService.approveOpportunity(id, orgId, actorId);
  }

  @Delete(':id')
  @RequirePermissions('opportunities:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an existing opportunity record' })
  @ApiResponse({ status: 200, description: 'Opportunity successfully soft deleted' })
  async deleteOpportunity(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    const actorId = activeUser.id;
    return this.opportunitiesService.deleteOpportunity(id, orgId, actorId);
  }

  @Get(':id/logs')
  @RequirePermissions('opportunities:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch audit log history for an opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity audit logs retrieved successfully' })
  async getOpportunityLogs(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    const orgId = activeUser.organizationId!;
    return this.opportunitiesService.getOpportunityLogs(id, orgId);
  }
}
