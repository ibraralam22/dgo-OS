import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  payment: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  invoice: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const PAYMENT_ID = 'payment-uuid';
const INVOICE_ID = 'invoice-uuid';

const mockInvoice = {
  id: INVOICE_ID,
  organizationId: ORG_ID,
  invoiceNumber: 'INV-2026-0001',
  status: 'SENT',
  total: 100,
  amountPaid: 0,
  balanceDue: 100,
};

const mockPayment = {
  id: PAYMENT_ID,
  organizationId: ORG_ID,
  invoiceId: INVOICE_ID,
  amount: 40,
  paymentDate: new Date(),
  paymentMethod: 'BANK_TRANSFER',
  status: 'SUCCESS',
  createdById: ACTOR_ID,
  invoice: mockInvoice,
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should record payment and update invoice totals', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const dto = {
        invoiceId: INVOICE_ID,
        amount: 40,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
      };

      const result = await service.createPayment(dto, ORG_ID, ACTOR_ID);

      expect(result).toBeDefined();
      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INVOICE_ID },
          data: {
            amountPaid: 40,
            balanceDue: 60,
            status: 'PARTIALLY_PAID',
          },
        }),
      );
    });

    it('should transition status to PAID if payment covers entire balance', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const dto = {
        invoiceId: INVOICE_ID,
        amount: 100,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CREDIT_CARD',
      };

      await service.createPayment(dto, ORG_ID, ACTOR_ID);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INVOICE_ID },
          data: {
            amountPaid: 100,
            balanceDue: 0,
            status: 'PAID',
          },
        }),
      );
    });

    it('should fail if amount exceeds outstanding balance', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const dto = {
        invoiceId: INVOICE_ID,
        amount: 120,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CASH',
      };

      await expect(service.createPayment(dto, ORG_ID, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });

    it('should fail if invoice is not in a payable status', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'DRAFT' });

      const dto = {
        invoiceId: INVOICE_ID,
        amount: 50,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CHECK',
      };

      await expect(service.createPayment(dto, ORG_ID, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('voidPayment', () => {
    it('should void a payment and restore invoice balances if caller is admin', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        invoice: { ...mockInvoice, status: 'PARTIALLY_PAID', amountPaid: 40, balanceDue: 60 },
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'VOID' });

      const result = await service.voidPayment(PAYMENT_ID, ORG_ID, ACTOR_ID, true);

      expect(result.status).toBe('VOID');
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INVOICE_ID },
          data: {
            amountPaid: 0,
            balanceDue: 100,
            status: 'SENT',
          },
        }),
      );
    });

    it('should throw ForbiddenException if caller is not an admin', async () => {
      await expect(
        service.voidPayment(PAYMENT_ID, ORG_ID, ACTOR_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if payment is already voided', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...mockPayment, status: 'VOID' });

      await expect(
        service.voidPayment(PAYMENT_ID, ORG_ID, ACTOR_ID, true),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
