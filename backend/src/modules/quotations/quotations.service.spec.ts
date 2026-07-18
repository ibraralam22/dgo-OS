import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuotationStatus, Prisma } from '@prisma/client';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

const mockPrisma = {
  quotation: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  quoteLineItem: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  opportunity: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createQuotation', () => {
    it('should create quotation and line items successfully', async () => {
      const opportunityId = 'opp-uuid-1';
      const orgId = 'org-uuid-1';
      const userId = 'user-uuid-1';

      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: opportunityId, organizationId: orgId });
      mockPrisma.quotation.count.mockResolvedValue(0); // version will be 1
      mockPrisma.quotation.create.mockResolvedValue({ id: 'quote-uuid-1', version: 1 });
      mockPrisma.quotation.findUnique.mockResolvedValue({ id: 'quote-uuid-1', version: 1, lineItems: [] });

      const dto: CreateQuotationDto = {
        opportunityId,
        expiresAt: new Date().toISOString(),
        discountPercentage: 10,
        taxPercentage: 5,
        lineItems: [
          { itemName: 'Dev 1', quantity: 2, unitPrice: 100 },
          { itemName: 'Dev 2', quantity: 1, unitPrice: 200 },
        ],
      };

      const result = await service.createQuotation(dto, orgId, userId);

      expect(result).toBeDefined();
      expect(mockPrisma.opportunity.findFirst).toHaveBeenCalledWith({
        where: { id: opportunityId, organizationId: orgId, deletedAt: null },
      });
      // Subtotal = 2 * 100 + 1 * 200 = 400. Discount 10% = 360. Tax 5% = 378.
      expect(mockPrisma.quotation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subtotal: new Prisma.Decimal(400),
          total: new Prisma.Decimal(378),
          requiresApproval: false,
          status: QuotationStatus.DRAFT,
        }),
      });
      expect(mockPrisma.quoteLineItem.createMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should set requiresApproval to true if discount is over 20%', async () => {
      const opportunityId = 'opp-uuid-1';
      const orgId = 'org-uuid-1';
      const userId = 'user-uuid-1';

      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: opportunityId, organizationId: orgId });
      mockPrisma.quotation.count.mockResolvedValue(0);
      mockPrisma.quotation.create.mockResolvedValue({ id: 'quote-uuid-1', version: 1 });
      mockPrisma.quotation.findUnique.mockResolvedValue({ id: 'quote-uuid-1', version: 1, lineItems: [] });

      const dto: CreateQuotationDto = {
        opportunityId,
        expiresAt: new Date().toISOString(),
        discountPercentage: 25, // > 20%
        taxPercentage: 0,
        lineItems: [{ itemName: 'Consultant', quantity: 10, unitPrice: 150 }],
      };

      await service.createQuotation(dto, orgId, userId);

      expect(mockPrisma.quotation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requiresApproval: true,
          approved: false,
        }),
      });
    });

    it('should throw NotFoundException if opportunity does not exist', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      const dto: CreateQuotationDto = {
        opportunityId: 'non-existent',
        expiresAt: new Date().toISOString(),
        lineItems: [{ itemName: 'Dev 1', quantity: 1, unitPrice: 100 }],
      };

      await expect(service.createQuotation(dto, 'org-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateQuotation', () => {
    it('should fail update if quotation status is not DRAFT', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue({
        id: 'quote-1',
        status: QuotationStatus.SENT, // Locked
        lineItems: [],
      });

      const dto: UpdateQuotationDto = { discountPercentage: 10 };

      await expect(service.updateQuotation('quote-1', dto, 'org-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approveQuotation', () => {
    it('should approve quotation if user is Admin/SuperAdmin', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue({ id: 'quote-1', organizationId: 'org-1' });
      mockPrisma.quotation.update.mockResolvedValue({ id: 'quote-1', approved: true });

      const result = await service.approveQuotation('quote-1', 'org-1', 'user-1', 'TenantAdmin', []);

      expect(result.approved).toBe(true);
      expect(mockPrisma.quotation.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: expect.objectContaining({
          approved: true,
          approvedById: 'user-1',
        }),
      });
    });

    it('should throw ForbiddenException if user lacks approval permissions', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue({ id: 'quote-1', organizationId: 'org-1' });

      await expect(
        service.approveQuotation('quote-1', 'org-1', 'user-1', 'SalesRep', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transitionStatus', () => {
    it('should block transition to APPROVED if discount requires approval and is not approved', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue({
        id: 'quote-1',
        status: QuotationStatus.SENT,
        requiresApproval: true,
        approved: false,
      });

      await expect(
        service.transitionStatus(
          'quote-1',
          { status: QuotationStatus.APPROVED },
          'org-1',
          'user-1',
          'Sales',
          [],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update opportunity amount and demote other active quotes when transition to APPROVED is successful', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue({
        id: 'quote-1',
        opportunityId: 'opp-1',
        status: QuotationStatus.SENT,
        requiresApproval: true,
        approved: true, // Already cleared by manager
        total: new Prisma.Decimal(5000),
      });
      mockPrisma.quotation.update.mockResolvedValue({ id: 'quote-1', status: QuotationStatus.APPROVED });

      const result = await service.transitionStatus(
        'quote-1',
        { status: QuotationStatus.APPROVED },
        'org-1',
        'user-1',
        'Sales',
        [],
      );

      expect(result.status).toBe(QuotationStatus.APPROVED);
      expect(mockPrisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: { amount: new Prisma.Decimal(5000) },
      });
      expect(mockPrisma.quotation.updateMany).toHaveBeenCalledWith({
        where: {
          opportunityId: 'opp-1',
          id: { not: 'quote-1' },
          status: QuotationStatus.APPROVED,
          deletedAt: null,
        },
        data: { status: QuotationStatus.SENT },
      });
    });
  });
});
