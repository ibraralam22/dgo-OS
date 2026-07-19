import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  invoice: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  invoiceLineItem: {
    deleteMany: jest.fn(),
  },
  account: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const INVOICE_ID = 'invoice-uuid';
const ACCOUNT_ID = 'account-uuid';

const mockInvoice = {
  id: INVOICE_ID,
  organizationId: ORG_ID,
  accountId: ACCOUNT_ID,
  invoiceNumber: 'INV-2026-0001',
  issueDate: new Date(),
  dueDate: new Date(),
  status: 'DRAFT',
  discountPercentage: 0,
  taxPercentage: 0,
  subtotal: 100,
  total: 100,
  amountPaid: 0,
  balanceDue: 100,
  currency: 'USD',
  lineItems: [
    { id: 'item-1', itemName: 'Consulting', quantity: 1, unitPrice: 100, subtotal: 100 },
  ],
};

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoice', () => {
    it('should create an invoice draft and calculate subtotal/total correctly', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID });
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        ...mockInvoice,
        discountPercentage: 10,
        taxPercentage: 5,
        subtotal: 100,
        total: 94.5,
        balanceDue: 94.5,
      });

      const dto = {
        accountId: ACCOUNT_ID,
        invoiceNumber: 'INV-2026-0001',
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        discountPercentage: 10,
        taxPercentage: 5,
        lineItems: [{ itemName: 'Service', quantity: 1, unitPrice: 100 }],
      };

      const result = await service.createInvoice(dto, ORG_ID, ACTOR_ID);

      expect(result.total).toBe(94.5);
      expect(result.balanceDue).toBe(94.5);
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should fail if account does not exist', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const dto = {
        accountId: 'bad-account',
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        lineItems: [{ itemName: 'Service', quantity: 1, unitPrice: 100 }],
      };

      await expect(service.createInvoice(dto, ORG_ID, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateInvoice', () => {
    it('should allow modifying an invoice in DRAFT status', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({ ...mockInvoice, memo: 'Updated Memo' });

      const result = await service.updateInvoice(INVOICE_ID, { memo: 'Updated Memo' }, ORG_ID, ACTOR_ID);

      expect(result.memo).toBe('Updated Memo');
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
    });

    it('should prevent modifying an invoice NOT in DRAFT status', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'SENT' });

      await expect(
        service.updateInvoice(INVOICE_ID, { memo: 'Try update' }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('patchStatus', () => {
    it('should transition status from DRAFT to SENT', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({ ...mockInvoice, status: 'SENT' });

      const result = await service.patchStatus(INVOICE_ID, { status: 'SENT' }, ORG_ID, ACTOR_ID);

      expect(result.status).toBe('SENT');
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SENT' } }),
      );
    });

    it('should fail if status is already PAID', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'PAID' });

      await expect(
        service.patchStatus(INVOICE_ID, { status: 'VOID' }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordPayment', () => {
    it('should process payment and transition status to PAID if fully paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'SENT', total: 100, balanceDue: 100, amountPaid: 0 });
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        amountPaid: 100,
        balanceDue: 0,
      });

      const result = await service.recordPayment(INVOICE_ID, { amount: 100 }, ORG_ID, ACTOR_ID);

      expect(result.status).toBe('PAID');
      expect(result.balanceDue).toBe(0);
      expect(result.amountPaid).toBe(100);
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            amountPaid: 100,
            balanceDue: 0,
            status: 'PAID',
          },
        }),
      );
    });

    it('should transition status to PARTIALLY_PAID if partially paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'SENT', total: 100, balanceDue: 100, amountPaid: 0 });
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PARTIALLY_PAID',
        amountPaid: 40,
        balanceDue: 60,
      });

      const result = await service.recordPayment(INVOICE_ID, { amount: 40 }, ORG_ID, ACTOR_ID);

      expect(result.status).toBe('PARTIALLY_PAID');
      expect(result.balanceDue).toBe(60);
      expect(result.amountPaid).toBe(40);
    });

    it('should fail if payment amount exceeds outstanding balance', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'SENT', total: 100, balanceDue: 100, amountPaid: 0 });

      await expect(
        service.recordPayment(INVOICE_ID, { amount: 150 }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteInvoice', () => {
    it('should allow deletion of a draft invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({ ...mockInvoice, deletedAt: new Date() });

      const result = await service.deleteInvoice(INVOICE_ID, ORG_ID, ACTOR_ID);

      expect(result.success).toBe(true);
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if deleting non-draft invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'SENT' });

      await expect(service.deleteInvoice(INVOICE_ID, ORG_ID, ACTOR_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
