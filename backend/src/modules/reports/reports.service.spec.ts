import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  opportunity: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  invoice: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  payment: {
    groupBy: jest.fn(),
  },
  ticket: {
    groupBy: jest.fn(),
  },
  savedReport: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const REPORT_ID = 'report-uuid';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesAnalytics', () => {
    it('should aggregate opportunities values and count totals', async () => {
      mockPrisma.opportunity.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
        _avg: { amount: 25000 },
        _count: 2,
      });
      mockPrisma.opportunity.groupBy.mockResolvedValue([
        { stage: 'DISCOVERY', _count: 2, _sum: { amount: 50000 } },
      ]);
      mockPrisma.opportunity.count.mockResolvedValueOnce(1); // Closed Won
      mockPrisma.opportunity.count.mockResolvedValueOnce(0); // Closed Lost

      const result = await service.getSalesAnalytics(ORG_ID);

      expect(result.totalDeals).toBe(2);
      expect(result.pipelineValue).toBe(50000);
      expect(result.averageDealSize).toBe(25000);
      expect(result.winRate).toBe(100);
      expect(result.stages).toHaveLength(1);
    });
  });

  describe('getFinancialAnalytics', () => {
    it('should aggregate invoice figures and list payment breakdowns', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { total: 12000, amountPaid: 8000, balanceDue: 4000 },
        _count: 3,
      });
      mockPrisma.invoice.groupBy.mockResolvedValue([
        { status: 'SENT', _count: 2 },
      ]);
      mockPrisma.payment.groupBy.mockResolvedValue([
        { paymentMethod: 'CREDIT_CARD', _sum: { amount: 8000 }, _count: 2 },
      ]);

      const result = await service.getFinancialAnalytics(ORG_ID);

      expect(result.invoicesCount).toBe(3);
      expect(result.totalBilled).toBe(12000);
      expect(result.totalPaid).toBe(8000);
      expect(result.totalOutstanding).toBe(4000);
      expect(result.statuses).toHaveLength(1);
      expect(result.paymentMethods).toHaveLength(1);
    });
  });

  describe('SavedReport Configs', () => {
    it('should create saved configurations correctly', async () => {
      const mockSaved = {
        id: REPORT_ID,
        name: 'Quarterly Invoicing report',
        category: 'FINANCIAL',
        config: { fromDate: '2026-04-01' },
      };

      mockPrisma.savedReport.create.mockResolvedValue(mockSaved);

      const result = await service.createSavedReport(ORG_ID, ACTOR_ID, {
        name: 'Quarterly Invoicing report',
        category: 'FINANCIAL',
        config: { fromDate: '2026-04-01' },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(REPORT_ID);
    });

    it('should fail to delete non-existing saved configurations', async () => {
      mockPrisma.savedReport.findFirst.mockResolvedValue(null);

      await expect(service.deleteSavedReport('invalid-id', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
