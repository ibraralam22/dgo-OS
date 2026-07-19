import { Test, TestingModule } from '@nestjs/testing';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OpportunityStage, Prisma } from '@prisma/client';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { TransitionStageDto } from './dto/transition-stage.dto';

const mockPrisma = {
  opportunity: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  projectOnboarding: {
    create: jest.fn(),
  },
  onboardingMilestone: {
    createMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OpportunitiesService>(OpportunitiesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOpportunity', () => {
    it('should create opportunity successfully and write audit log', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const dto: CreateOpportunityDto = {
        name: 'ACME - 10 Java Devs Squad',
        accountId: 'account-uuid-1',
        ownerId: 'owner-uuid-1',
        amount: 150000,
        closeDate: futureDate.toISOString(),
        description: 'Staffing squad',
      };

      const mockOpp = {
        id: 'opp-uuid-1',
        ...dto,
        amount: new Prisma.Decimal(dto.amount),
        stage: OpportunityStage.DISCOVERY,
        probability: 10,
        requiresApproval: false,
        approved: false,
      };

      mockPrisma.opportunity.create.mockResolvedValue(mockOpp);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.createOpportunity(dto, 'org-uuid-1', 'actor-uuid-1');

      expect(result).toEqual(mockOpp);
      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-uuid-1',
          name: dto.name,
          stage: OpportunityStage.DISCOVERY,
          probability: 10,
          requiresApproval: false,
        }),
      });
    });

    it('should throw BadRequestException if closeDate is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const dto: CreateOpportunityDto = {
        name: 'ACME - 10 Java Devs Squad',
        accountId: 'account-uuid-1',
        amount: 150000,
        closeDate: pastDate.toISOString(),
      };

      await expect(service.createOpportunity(dto, 'org-uuid-1', 'actor-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should flag requiresApproval if amount > $10,000,000', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const dto: CreateOpportunityDto = {
        name: 'Mega Enterprise Account',
        accountId: 'account-uuid-1',
        amount: 12000000, // $12M
        closeDate: futureDate.toISOString(),
      };

      mockPrisma.opportunity.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const result = await service.createOpportunity(dto, 'org-uuid-1', 'actor-uuid-1');
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('listOpportunities', () => {
    it('should return paginated opportunities', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([{ id: 'opp-1', name: 'Opp 1' }]);
      mockPrisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listOpportunities('org-1', {
        page: 1,
        limit: 10,
        search: 'Opp',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.opportunity.findMany).toHaveBeenCalled();
    });
  });

  describe('transitionStage', () => {
    it('should transition stage to CLOSED_WON successfully and trigger project onboarding', async () => {
      const mockOpp = {
        id: 'opp-1',
        name: 'ACME',
        organizationId: 'org-1',
        amount: new Prisma.Decimal(100000),
        stage: OpportunityStage.NEGOTIATION,
        probability: 70,
        requiresApproval: false,
        approved: false,
        deletedAt: null,
      };

      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpp);
      mockPrisma.opportunity.update.mockResolvedValue({
        ...mockOpp,
        stage: OpportunityStage.CLOSED_WON,
        probability: 100,
        contractUrl: 'https://contract.pdf',
      });
      mockPrisma.projectOnboarding.create.mockResolvedValue({ id: 'onboarding-1' });

      const dto: TransitionStageDto = {
        stage: OpportunityStage.CLOSED_WON,
        contractUrl: 'https://contract.pdf',
      };

      const result = await service.transitionStage('opp-1', dto, 'org-1', 'actor-1', 'SalesRepresentative');

      expect(result.success).toBe(true);
      expect(result.triggeredOnboardingId).toBe('onboarding-1');
      expect(prisma.projectOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          opportunityId: 'opp-1',
          name: 'ACME - Project Onboarding',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should throw BadRequestException if $0 deal tries to progress past DISCOVERY', async () => {
      const mockOpp = {
        id: 'opp-1',
        name: 'ACME',
        organizationId: 'org-1',
        amount: new Prisma.Decimal(0), // $0.00
        stage: OpportunityStage.DISCOVERY,
        probability: 10,
        requiresApproval: false,
        approved: false,
        deletedAt: null,
      };

      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpp);

      const dto: TransitionStageDto = {
        stage: OpportunityStage.PROPOSAL,
      };

      await expect(
        service.transitionStage('opp-1', dto, 'org-1', 'actor-1', 'SalesRepresentative'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if high-value deal transitions to CLOSED_WON without approval', async () => {
      const mockOpp = {
        id: 'opp-1',
        name: 'ACME',
        organizationId: 'org-1',
        amount: new Prisma.Decimal(12000000), // $12M
        stage: OpportunityStage.NEGOTIATION,
        probability: 70,
        requiresApproval: true,
        approved: false, // Not approved!
        deletedAt: null,
      };

      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpp);

      const dto: TransitionStageDto = {
        stage: OpportunityStage.CLOSED_WON,
        contractUrl: 'https://contract.pdf',
      };

      await expect(
        service.transitionStage('opp-1', dto, 'org-1', 'actor-1', 'SalesRepresentative'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce stage locking unless TenantAdmin/SuperAdmin', async () => {
      const mockOpp = {
        id: 'opp-1',
        name: 'ACME',
        organizationId: 'org-1',
        amount: new Prisma.Decimal(100000),
        stage: OpportunityStage.CLOSED_WON, // Closed stage!
        probability: 100,
        requiresApproval: false,
        approved: false,
        deletedAt: null,
      };

      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpp);

      const dto: TransitionStageDto = {
        stage: OpportunityStage.NEGOTIATION,
      };

      // SalesRepresentative role: should fail
      await expect(
        service.transitionStage('opp-1', dto, 'org-1', 'actor-1', 'SalesRepresentative'),
      ).rejects.toThrow(BadRequestException);

      // SuperAdmin role: should succeed (mock update resolve)
      mockPrisma.opportunity.update.mockResolvedValue({
        ...mockOpp,
        stage: OpportunityStage.NEGOTIATION,
        probability: 70,
      });

      const result = await service.transitionStage('opp-1', dto, 'org-1', 'actor-1', 'SuperAdmin');
      expect(result.success).toBe(true);
    });
  });

  describe('approveOpportunity', () => {
    it('should approve opportunity successfully', async () => {
      const mockOpp = {
        id: 'opp-1',
        requiresApproval: true,
        approved: false,
        organizationId: 'org-1',
      };

      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpp);
      mockPrisma.opportunity.update.mockResolvedValue({ ...mockOpp, approved: true });

      const result = await service.approveOpportunity('opp-1', 'org-1', 'actor-1');

      expect(result.approved).toBe(true);
      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: { approved: true, updatedBy: 'actor-1' },
      });
    });
  });
});
