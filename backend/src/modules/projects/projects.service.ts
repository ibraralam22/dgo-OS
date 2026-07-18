import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List paginated project onboardings with filters and search
   */
  async listProjects(
    orgId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      managerId?: string;
      search?: string;
    },
  ) {
    const skip = (query.page - 1) * query.limit;
    const where: any = { organizationId: orgId, deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }
    if (query.managerId) {
      where.assignedManagerId = query.managerId;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.projectOnboarding.count({ where }),
      this.prisma.projectOnboarding.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: {
          assignedManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          opportunity: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  domain: true,
                },
              },
            },
          },
          milestones: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return { total, data };
  }

  /**
   * Retrieve details of a specific project onboarding
   */
  async getProjectById(id: string, orgId: string) {
    const project = await this.prisma.projectOnboarding.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        assignedManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        opportunity: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project onboarding ${id} not found`);
    }

    return project;
  }

  /**
   * Update project metadata, status, delivery templates, and manager assignment
   */
  async updateProject(id: string, dto: UpdateProjectDto, orgId: string, actorUserId: string) {
    const project = await this.prisma.projectOnboarding.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException(`Project onboarding ${id} not found`);
    }

    // Verify manager exists inside the organization if assigning a new manager
    if (dto.assignedManagerId) {
      const managerExists = await this.prisma.userOrganization.findFirst({
        where: { userId: dto.assignedManagerId, organizationId: orgId },
      });
      if (!managerExists) {
        throw new BadRequestException(`Assigned user is not part of this organization`);
      }
    }

    const data: any = {
      name: dto.name !== undefined ? dto.name : project.name,
      status: dto.status !== undefined ? dto.status : project.status,
      templateType: dto.templateType !== undefined ? dto.templateType : project.templateType,
      targetStartDate: dto.targetStartDate !== undefined ? new Date(dto.targetStartDate) : project.targetStartDate,
      assignedManagerId: dto.assignedManagerId !== undefined ? dto.assignedManagerId : project.assignedManagerId,
    };

    // Calculate completedAt timestamp
    if (dto.status === 'COMPLETED' && project.status !== 'COMPLETED') {
      data.completedAt = new Date();
    } else if (dto.status && dto.status !== 'COMPLETED' && project.status === 'COMPLETED') {
      data.completedAt = null;
    }

    const updated = await this.prisma.projectOnboarding.update({
      where: { id },
      data,
      include: {
        assignedManager: {
          select: { id: true, firstName: true, lastName: true },
        },
        milestones: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'project.update',
        resourceName: 'project',
        resourceId: id,
        payloadBefore: project as any,
        payloadAfter: updated as any,
      },
    });

    return updated;
  }

  /**
   * Add a custom milestone checklist task
   */
  async addMilestone(projectId: string, dto: CreateMilestoneDto, orgId: string, actorUserId: string) {
    const project = await this.prisma.projectOnboarding.findFirst({
      where: { id: projectId, organizationId: orgId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException(`Project onboarding ${projectId} not found`);
    }

    const milestone = await this.prisma.onboardingMilestone.create({
      data: {
        organizationId: orgId,
        projectOnboardingId: projectId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'project.milestone_created',
        resourceName: 'project',
        resourceId: projectId,
        payloadAfter: milestone as any,
      },
    });

    return milestone;
  }

  /**
   * Toggle completion status or edit details of a checklist milestone
   */
  async updateMilestone(
    projectId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
    orgId: string,
    actorUserId: string,
  ) {
    const milestone = await this.prisma.onboardingMilestone.findFirst({
      where: { id: milestoneId, projectOnboardingId: projectId, organizationId: orgId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found on project ${projectId}`);
    }

    const data: any = {
      title: dto.title !== undefined ? dto.title : milestone.title,
      completed: dto.completed !== undefined ? dto.completed : milestone.completed,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : milestone.dueDate,
    };

    if (dto.completed === true && !milestone.completed) {
      data.completedAt = new Date();
    } else if (dto.completed === false && milestone.completed) {
      data.completedAt = null;
    }

    const updated = await this.prisma.onboardingMilestone.update({
      where: { id: milestoneId },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: dto.completed !== undefined ? 'project.milestone_toggled' : 'project.milestone_updated',
        resourceName: 'project',
        resourceId: projectId,
        payloadBefore: milestone as any,
        payloadAfter: updated as any,
      },
    });

    return updated;
  }

  /**
   * Remove a milestone checklist task
   */
  async deleteMilestone(projectId: string, milestoneId: string, orgId: string, actorUserId: string) {
    const milestone = await this.prisma.onboardingMilestone.findFirst({
      where: { id: milestoneId, projectOnboardingId: projectId, organizationId: orgId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found on project ${projectId}`);
    }

    await this.prisma.onboardingMilestone.delete({
      where: { id: milestoneId },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'project.milestone_deleted',
        resourceName: 'project',
        resourceId: projectId,
        payloadBefore: milestone as any,
      },
    });

    return { success: true };
  }

  /**
   * Delete / Archive a project onboarding pipeline
   */
  async deleteProject(id: string, orgId: string, actorUserId: string) {
    const project = await this.prisma.projectOnboarding.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException(`Project onboarding ${id} not found`);
    }

    const deleted = await this.prisma.projectOnboarding.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'project.delete',
        resourceName: 'project',
        resourceId: id,
        payloadBefore: project as any,
      },
    });

    return { success: true };
  }
}
