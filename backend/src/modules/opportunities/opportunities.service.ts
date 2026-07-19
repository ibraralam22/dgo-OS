import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { TransitionStageDto } from './dto/transition-stage.dto';
import { OpportunityStage, Prisma } from '@prisma/client';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStageToProbability(stage: OpportunityStage): number {
    switch (stage) {
      case OpportunityStage.DISCOVERY:
        return 10;
      case OpportunityStage.PROPOSAL:
        return 40;
      case OpportunityStage.NEGOTIATION:
        return 70;
      case OpportunityStage.CLOSED_WON:
        return 100;
      case OpportunityStage.CLOSED_LOST:
        return 0;
      default:
        return 10;
    }
  }

  async createOpportunity(dto: CreateOpportunityDto, orgId: string, actorUserId: string) {
    const closeDate = new Date(dto.closeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (closeDate < today) {
      throw new BadRequestException('Close date cannot be in the past at creation time');
    }

    const probability = this.mapStageToProbability(OpportunityStage.DISCOVERY);
    const requiresApproval = Number(dto.amount) > 10000000;

    const opportunity = await this.prisma.opportunity.create({
      data: {
        organizationId: orgId,
        accountId: dto.accountId,
        ownerId: dto.ownerId || null,
        name: dto.name,
        stage: OpportunityStage.DISCOVERY,
        amount: new Prisma.Decimal(dto.amount),
        probability,
        closeDate,
        description: dto.description || null,
        requiresApproval,
        approved: false,
        createdBy: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'opportunity.create',
        resourceName: 'opportunity',
        resourceId: opportunity.id,
        payloadAfter: opportunity as any,
      },
    });

    return opportunity;
  }

  async listOpportunities(
    orgId: string,
    options: { page: number; limit: number; search?: string; stage?: OpportunityStage; accountId?: string },
  ) {
    const { page, limit, search, stage, accountId } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.OpportunityWhereInput = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (stage) {
      where.stage = stage;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { account: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { data, total };
  }

  async getOpportunity(id: string, orgId: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity record not found');
    }

    return opportunity;
  }

  async updateOpportunity(
    id: string,
    dto: UpdateOpportunityDto,
    orgId: string,
    actorUserId: string,
  ) {
    const opportunity = await this.getOpportunity(id, orgId);

    if (dto.closeDate) {
      const closeDate = new Date(dto.closeDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (closeDate < today) {
        throw new BadRequestException('Close date cannot be in the past');
      }
    }

    const newAmount = dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : opportunity.amount;
    const requiresApproval = Number(newAmount) > 10000000;

    const updatedOpportunity = await this.prisma.opportunity.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : opportunity.name,
        accountId: dto.accountId !== undefined ? dto.accountId : opportunity.accountId,
        ownerId: dto.ownerId !== undefined ? dto.ownerId : opportunity.ownerId,
        amount: newAmount,
        closeDate: dto.closeDate !== undefined ? new Date(dto.closeDate) : opportunity.closeDate,
        description: dto.description !== undefined ? dto.description : opportunity.description,
        requiresApproval,
        updatedBy: actorUserId,
      },
    });

    const isAmountChanged = Number(opportunity.amount) !== Number(newAmount);
    if (isAmountChanged) {
      await this.prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'opportunity.amount_modified',
          resourceName: 'opportunity',
          resourceId: id,
          payloadBefore: { amount: opportunity.amount.toString() } as any,
          payloadAfter: { amount: newAmount.toString() } as any,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'opportunity.update',
        resourceName: 'opportunity',
        resourceId: id,
        payloadBefore: opportunity as any,
        payloadAfter: updatedOpportunity as any,
      },
    });

    return updatedOpportunity;
  }

  async transitionStage(
    id: string,
    dto: TransitionStageDto,
    orgId: string,
    actorUserId: string,
    userRole: string,
  ) {
    // 1. Fetch current opportunity
    const opportunity = await this.getOpportunity(id, orgId);

    // 2. Stage Locking validation
    const isCurrentlyClosed =
      opportunity.stage === OpportunityStage.CLOSED_WON ||
      opportunity.stage === OpportunityStage.CLOSED_LOST;
    const isAuthorizedToReopen = userRole === 'SuperAdmin' || userRole === 'TenantAdmin';

    if (isCurrentlyClosed && !isAuthorizedToReopen) {
      throw new BadRequestException(
        'Once a deal is CLOSED_WON or CLOSED_LOST, the stage is locked. Any modifications require administrator verification.',
      );
    }

    // 3. Minimum budget progression validation
    const isProgressingPastDiscovery = dto.stage !== OpportunityStage.DISCOVERY;
    if (isProgressingPastDiscovery && Number(opportunity.amount) <= 0) {
      throw new BadRequestException(
        'Minimum budget rules enforced. Deals with a budget of $0.00 cannot progress past the DISCOVERY stage.',
      );
    }

    // 4. VP Approval check for High-Value CLOSED_WON transition
    if (dto.stage === OpportunityStage.CLOSED_WON && opportunity.requiresApproval && !opportunity.approved) {
      throw new BadRequestException(
        'High-value deals exceeding $10,000,000 require VP approval before closing as Won.',
      );
    }

    // 5. Closed-won SOW/Contract validation
    if (dto.stage === OpportunityStage.CLOSED_WON) {
      if (!dto.contractUrl) {
        throw new BadRequestException(
          'Transition to CLOSED_WON requires uploading a Signed Statement of Work (SOW) or Contract draft link.',
        );
      }
    }

    // 6. Closed-lost feedback validation
    if (dto.stage === OpportunityStage.CLOSED_LOST) {
      if (!dto.lossReason) {
        throw new BadRequestException(
          'Transition to CLOSED_LOST requires completing the lossReason details.',
        );
      }
    }

    const probability = this.mapStageToProbability(dto.stage);

    // 7. Atomic transaction for database update + onboarding pipeline initialization
    return this.prisma.$transaction(async (tx) => {
      const updatedOpportunity = await tx.opportunity.update({
        where: { id },
        data: {
          stage: dto.stage,
          probability,
          contractUrl: dto.stage === OpportunityStage.CLOSED_WON ? dto.contractUrl : null,
          lossReason: dto.stage === OpportunityStage.CLOSED_LOST ? dto.lossReason : null,
          competitorLostTo: dto.stage === OpportunityStage.CLOSED_LOST ? dto.competitorLostTo || null : null,
          updatedBy: actorUserId,
        },
      });

      let triggeredOnboardingId: string | null = null;

      if (dto.stage === OpportunityStage.CLOSED_WON) {
        const onboarding = await tx.projectOnboarding.create({
          data: {
            organizationId: orgId,
            opportunityId: id,
            name: `${updatedOpportunity.name} - Project Onboarding`,
            status: 'IN_PROGRESS',
            templateType: 'STAFF_AUGMENTATION',
            targetStartDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default: T+14 days
          },
        });
        triggeredOnboardingId = onboarding.id;

        // Auto-populate default onboarding checklist milestones
        const defaultMilestones = [
          'Kickoff Meeting Scheduled',
          'Contract Signed & Uploaded',
          'GitHub & Slack Handover',
          'First Month Invoice Sent',
        ];

        await tx.onboardingMilestone.createMany({
          data: defaultMilestones.map((title) => ({
            organizationId: orgId,
            projectOnboardingId: onboarding.id,
            title,
            completed: false,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'opportunity.stage_changed',
          resourceName: 'opportunity',
          resourceId: id,
          payloadBefore: {
            stage: opportunity.stage,
            probability: opportunity.probability,
          } as any,
          payloadAfter: {
            stage: updatedOpportunity.stage,
            probability: updatedOpportunity.probability,
            triggeredOnboardingId,
          } as any,
        },
      });

      return {
        success: true,
        opportunity: updatedOpportunity,
        triggeredOnboardingId,
      };
    });
  }

  async approveOpportunity(id: string, orgId: string, actorUserId: string) {
    const opportunity = await this.getOpportunity(id, orgId);

    if (!opportunity.requiresApproval) {
      throw new BadRequestException('This opportunity does not require special high-value approval.');
    }

    const approvedOpportunity = await this.prisma.opportunity.update({
      where: { id },
      data: {
        approved: true,
        updatedBy: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'opportunity.approved',
        resourceName: 'opportunity',
        resourceId: id,
        payloadAfter: { approved: true } as any,
      },
    });

    return approvedOpportunity;
  }

  async deleteOpportunity(id: string, orgId: string, actorUserId: string) {
    const opportunity = await this.getOpportunity(id, orgId);

    const deletedOpportunity = await this.prisma.opportunity.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'opportunity.delete',
        resourceName: 'opportunity',
        resourceId: id,
        payloadBefore: { name: opportunity.name } as any,
      },
    });

    return deletedOpportunity;
  }

  async getOpportunityLogs(id: string, orgId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        resourceName: 'opportunity',
        resourceId: id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
}
