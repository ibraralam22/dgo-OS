import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PatchInvoiceStatusDto } from './dto/patch-status.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

const INVOICE_INCLUDE = {
  account: { select: { id: true, name: true, domain: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  lineItems: true,
  opportunity: { select: { id: true, name: true } },
  quotation: { select: { id: true, version: true } },
};

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List Invoices ───────────────────────────────────────────────────────────

  async listInvoices(
    orgId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      accountId?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const skip = (query.page - 1) * query.limit;
    const where: any = { organizationId: orgId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.accountId) where.accountId = query.accountId;

    if (query.search) {
      where.invoiceNumber = { contains: query.search, mode: 'insensitive' };
    }

    if (query.fromDate || query.toDate) {
      where.issueDate = {};
      if (query.fromDate) where.issueDate.gte = new Date(query.fromDate);
      if (query.toDate) where.issueDate.lte = new Date(query.toDate);
    }

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: INVOICE_INCLUDE,
      }),
    ]);

    return { total, data };
  }

  // ─── Get KPIs ────────────────────────────────────────────────────────────────

  async getKpis(orgId: string) {
    const activeInvoices = await this.prisma.invoice.findMany({
      where: { organizationId: orgId, deletedAt: null, status: { not: 'VOID' } },
      select: {
        total: true,
        amountPaid: true,
        balanceDue: true,
        status: true,
      },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;

    for (const inv of activeInvoices) {
      const tot = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const due = Number(inv.balanceDue);

      totalBilled += tot;
      totalPaid += paid;
      totalOutstanding += due;

      if (inv.status === 'OVERDUE') {
        overdueCount++;
      }
    }

    return {
      totalBilled,
      totalPaid,
      totalOutstanding,
      overdueCount,
    };
  }

  // ─── Get Detail ──────────────────────────────────────────────────────────────

  async getInvoiceById(id: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
    return invoice;
  }

  // ─── Create Invoice ──────────────────────────────────────────────────────────

  async createInvoice(dto: CreateInvoiceDto, orgId: string, actorId: string) {
    // Validate account
    await this.assertAccountExists(dto.accountId, orgId);

    // Verify unique invoice number or generate
    let invoiceNumber = dto.invoiceNumber;
    if (invoiceNumber) {
      const exists = await this.prisma.invoice.findFirst({
        where: { organizationId: orgId, invoiceNumber, deletedAt: null },
      });
      if (exists) {
        throw new BadRequestException(`Invoice number "${invoiceNumber}" already exists`);
      }
    } else {
      const count = await this.prisma.invoice.count({ where: { organizationId: orgId } });
      invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculations
    const disc = dto.discountPercentage || 0;
    const tax = dto.taxPercentage || 0;
    const { subtotal, total, balanceDue } = this.calculateAmounts(dto.lineItems, disc, tax, 0);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: orgId,
        accountId: dto.accountId,
        invoiceNumber,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        discountPercentage: disc,
        taxPercentage: tax,
        subtotal,
        total,
        balanceDue,
        amountPaid: 0,
        currency: dto.currency || 'USD',
        memo: dto.memo || null,
        opportunityId: dto.opportunityId || null,
        quotationId: dto.quotationId || null,
        createdById: actorId,
        lineItems: {
          create: dto.lineItems.map((item) => ({
            itemName: item.itemName,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: INVOICE_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'invoice.create', invoice.id, null, invoice);
    return invoice;
  }

  // ─── Update Invoice (DRAFT only) ─────────────────────────────────────────────

  async updateInvoice(id: string, dto: UpdateInvoiceDto, orgId: string, actorId: string) {
    const existing = await this.assertInvoiceExists(id, orgId);

    if (existing.status !== 'DRAFT') {
      throw new ForbiddenException('Only invoices in DRAFT status can be modified');
    }

    if (dto.accountId) {
      await this.assertAccountExists(dto.accountId, orgId);
    }

    if (dto.invoiceNumber && dto.invoiceNumber !== existing.invoiceNumber) {
      const exists = await this.prisma.invoice.findFirst({
        where: { organizationId: orgId, invoiceNumber: dto.invoiceNumber, deletedAt: null },
      });
      if (exists) {
        throw new BadRequestException(`Invoice number "${dto.invoiceNumber}" already exists`);
      }
    }

    // Check line items replacement
    const updatedLineItems = dto.lineItems || existing.lineItems.map(item => ({
      itemName: item.itemName,
      description: item.description || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    }));

    const disc = dto.discountPercentage !== undefined ? dto.discountPercentage : Number(existing.discountPercentage);
    const tax = dto.taxPercentage !== undefined ? dto.taxPercentage : Number(existing.taxPercentage);
    const { subtotal, total, balanceDue } = this.calculateAmounts(updatedLineItems, disc, tax, Number(existing.amountPaid));

    const updated = await this.prisma.$transaction(async (tx) => {
      // If line items provided, replace them
      if (dto.lineItems) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          accountId: dto.accountId || undefined,
          invoiceNumber: dto.invoiceNumber || undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          discountPercentage: disc,
          taxPercentage: tax,
          subtotal,
          total,
          balanceDue,
          currency: dto.currency || undefined,
          memo: dto.memo !== undefined ? dto.memo : undefined,
          opportunityId: dto.opportunityId || undefined,
          quotationId: dto.quotationId || undefined,
          lineItems: dto.lineItems
            ? {
                create: dto.lineItems.map((item) => ({
                  itemName: item.itemName,
                  description: item.description || null,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.quantity * item.unitPrice,
                })),
              }
            : undefined,
        },
        include: INVOICE_INCLUDE,
      });
    });

    await this.writeAudit(orgId, actorId, 'invoice.update', id, existing, updated);
    return updated;
  }

  // ─── Patch Status ─────────────────────────────────────────────────────────────

  async patchStatus(id: string, dto: PatchInvoiceStatusDto, orgId: string, actorId: string) {
    const existing = await this.assertInvoiceExists(id, orgId);

    // DRAFT -> SENT or VOID
    // SENT -> VOID or OVERDUE
    // PARTIALLY_PAID -> VOID or OVERDUE
    // OVERDUE -> VOID
    if (existing.status === 'PAID' || existing.status === 'VOID') {
      throw new BadRequestException(`Cannot change status of a ${existing.status} invoice`);
    }

    if (dto.status === 'SENT' && existing.status !== 'DRAFT') {
      throw new BadRequestException('Can only mark DRAFT invoices as SENT');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: dto.status as any },
      include: INVOICE_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'invoice.status_changed', id, existing, updated);
    return updated;
  }

  // ─── Record Payment ──────────────────────────────────────────────────────────

  async recordPayment(id: string, dto: RecordPaymentDto, orgId: string, actorId: string) {
    const existing = await this.assertInvoiceExists(id, orgId);

    if (!['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(existing.status)) {
      throw new BadRequestException('Can only record payments on SENT, PARTIALLY_PAID, or OVERDUE invoices');
    }

    const currentDue = Number(existing.balanceDue);
    if (dto.amount > currentDue) {
      throw new BadRequestException(`Payment amount (${dto.amount}) exceeds outstanding balance (${currentDue})`);
    }

    const amountPaid = Number(existing.amountPaid) + dto.amount;
    const balanceDue = Number(existing.total) - amountPaid;
    const status = balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        amountPaid,
        balanceDue,
        status,
      },
      include: INVOICE_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'invoice.payment_recorded', id, existing, updated);
    return updated;
  }

  // ─── Delete Invoice (DRAFT only) ─────────────────────────────────────────────

  async deleteInvoice(id: string, orgId: string, actorId: string) {
    const existing = await this.assertInvoiceExists(id, orgId);

    if (existing.status !== 'DRAFT') {
      throw new ForbiddenException('Only invoices in DRAFT status can be deleted/archived');
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.writeAudit(orgId, actorId, 'invoice.delete', id, existing, null);
    return { success: true };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async assertInvoiceExists(id: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { lineItems: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
    return invoice;
  }

  private async assertAccountExists(accountId: string, orgId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, organizationId: orgId, deletedAt: null },
    });
    if (!account) throw new BadRequestException(`Client Account with ID ${accountId} not found`);
  }

  private calculateAmounts(
    lineItems: { quantity: number; unitPrice: number }[],
    discountPercentage: number,
    taxPercentage: number,
    amountPaid = 0,
  ) {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const discountAmount = subtotal * (discountPercentage / 100);
    const taxAmount = (subtotal - discountAmount) * (taxPercentage / 100);
    const total = subtotal - discountAmount + taxAmount;
    const balanceDue = total - amountPaid;

    return {
      subtotal,
      total,
      balanceDue,
    };
  }

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
        resourceName: 'invoice',
        resourceId,
        payloadBefore: before ?? undefined,
        payloadAfter: after ?? undefined,
      },
    });
  }
}
