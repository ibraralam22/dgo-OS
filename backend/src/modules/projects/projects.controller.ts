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
import { ProjectsService } from './projects.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('projects:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query paginated project onboardings inside tenant organization' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async listProjects(
    @ActiveUser() user: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
    @Query('search') search?: string,
  ) {
    return this.projectsService.listProjects(user.organizationId!, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      status,
      managerId,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('projects:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch project onboarding details by ID' })
  @ApiResponse({ status: 200, description: 'Project onboarding details retrieved' })
  async getProjectById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.projectsService.getProjectById(id, user.organizationId!);
  }

  @Put(':id')
  @RequirePermissions('projects:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify project onboarding specifications or manager assignment' })
  @ApiResponse({ status: 200, description: 'Project onboarding updated successfully' })
  async updateProject(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(id, dto, user.organizationId!, user.id);
  }

  @Post(':id/milestones')
  @RequirePermissions('projects:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a custom milestone deliverable to project checklist' })
  @ApiResponse({ status: 201, description: 'Milestone added successfully' })
  async addMilestone(
    @Param('id') projectId: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.addMilestone(projectId, dto, user.organizationId!, user.id);
  }

  @Put(':projectId/milestones/:milestoneId')
  @RequirePermissions('projects:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition milestone completion status or details' })
  @ApiResponse({ status: 200, description: 'Milestone updated successfully' })
  async updateMilestone(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.projectsService.updateMilestone(projectId, milestoneId, dto, user.organizationId!, user.id);
  }

  @Delete(':projectId/milestones/:milestoneId')
  @RequirePermissions('projects:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a milestone deliverable from the checklist' })
  @ApiResponse({ status: 200, description: 'Milestone deleted successfully' })
  async deleteMilestone(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.projectsService.deleteMilestone(projectId, milestoneId, user.organizationId!, user.id);
  }

  @Delete(':id')
  @RequirePermissions('projects:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/Archive a project onboarding flow' })
  @ApiResponse({ status: 200, description: 'Project onboarding deleted successfully' })
  async deleteProject(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.projectsService.deleteProject(id, user.organizationId!, user.id);
  }
}
