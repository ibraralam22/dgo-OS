import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const PAYMENT_INCLUDE = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      balanceDue: true,
      amountPaid: true,
      status: true,
      account: { select: { id: true, name: true, domain: true } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List Payments ───────────────────────────────────────────────────────────

  async listPayments(
    orgId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      invoiceId?: string;
      paymentMethod?: string;
      search?: string; // Reference Number search
    },
  ) {
    const skip = (query.page - 1) * query.limit;
    const where: any = { organizationId: orgId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    if (query.search) {
      where.referenceNumber = { contains: query.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: PAYMENT_INCLUDE,
      }),
    ]);

    return { total, data };
  }

  // ─── Get Detail ──────────────────────────────────────────────────────────────

  async getPaymentById(id: string, orgId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: PAYMENT_INCLUDE,
    });
    if (!payment) throw new NotFoundException(`Payment transaction with ID ${id} not found`);
    return payment;
  }

  // ─── Record Payment ──────────────────────────────────────────────────────────

  async createPayment(dto: CreatePaymentDto, orgId: string, actorId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, organizationId: orgId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${dto.invoiceId} not found`);
    }

    if (!['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) {
      throw new BadRequestException('Payments can only be recorded on SENT, PARTIALLY_PAID, or OVERDUE invoices');
    }

    const currentDue = Number(invoice.balanceDue);
    if (dto.amount > currentDue) {
      throw new BadRequestException(`Payment amount (${dto.amount}) exceeds outstanding invoice balance (${currentDue})`);
    }

    const newAmountPaid = Number(invoice.amountPaid) + dto.amount;
    const newBalanceDue = Number(invoice.total) - newAmountPaid;
    const newInvoiceStatus = newBalanceDue <= 0.001 ? 'PAID' : 'PARTIALLY_PAID';

    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment transaction
      const payment = await tx.payment.create({
        data: {
          organizationId: orgId,
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod as any,
          referenceNumber: dto.referenceNumber || null,
          notes: dto.notes || null,
          status: 'SUCCESS',
          createdById: actorId,
        },
        include: PAYMENT_INCLUDE,
      });

      // Update invoice totals and status
      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newInvoiceStatus,
        },
      });

      return payment;
    });

    await this.writeAudit(orgId, actorId, 'payment.create', result.id, null, result);
    return result;
  }

  // ─── Void Payment ─────────────────────────────────────────────────────────────

  async voidPayment(id: string, orgId: string, actorId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new ForbiddenException('Only Administrators are authorized to void payments');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment transaction with ID ${id} not found`);
    }

    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException(`Cannot void a payment with status ${payment.status}`);
    }

    const invoice = payment.invoice;
    const paymentAmount = Number(payment.amount);

    const newAmountPaid = Math.max(0, Number(invoice.amountPaid) - paymentAmount);
    const newBalanceDue = Number(invoice.total) - newAmountPaid;

    let newInvoiceStatus = 'PARTIALLY_PAID';
    if (newAmountPaid === 0) {
      newInvoiceStatus = 'SENT';
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Set status to VOID
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status: 'VOID' },
        include: PAYMENT_INCLUDE,
      });

      // Reverse invoice totals
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newInvoiceStatus as any,
        },
      });

      return updatedPayment;
    });

    await this.writeAudit(orgId, actorId, 'payment.void', id, payment, result);
    return result;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async writeAudit(
    orgId: string,
    userId: string,
    action: string,
    resourceId: string,
    before: any,
    after: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action,
        resourceName: 'payment',
        resourceId,
        payloadBefore: before ?? undefined,
        payloadAfter: after ?? undefined,
      },
    });
  }
}
