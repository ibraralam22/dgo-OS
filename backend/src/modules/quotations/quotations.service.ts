import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { TransitionQuotationStatusDto } from './dto/transition-quotation-status.dto';
import { QuotationStatus, Prisma } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to calculate subtotals and totals for a quote
   */
  private calculateQuoteTotals(
    lineItems: any[],
    discountPercentage = 0,
    taxPercentage = 0,
  ) {
    let subtotal = 0;
    const items = lineItems.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      return {
        ...item,
        subtotal: itemSubtotal,
      };
    });

    const discountMultiplier = 1 - discountPercentage / 100;
    const taxMultiplier = 1 + taxPercentage / 100;
    const total = subtotal * discountMultiplier * taxMultiplier;

    return {
      subtotal,
      total,
      items,
    };
  }

  /**
   * Create a new quotation version for an opportunity
   */
  async createQuotation(dto: CreateQuotationDto, orgId: string, actorUserId: string) {
    // 1. Verify Opportunity exists and belongs to the same organization
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, organizationId: orgId, deletedAt: null },
    });
    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${dto.opportunityId} not found`);
    }

    // 2. Resolve version number (Count existing versions for this opportunity and increment)
    const existingCount = await this.prisma.quotation.count({
      where: { opportunityId: dto.opportunityId, organizationId: orgId, deletedAt: null },
    });
    const version = existingCount + 1;

    // 3. Compute pricing figures
    const discountPercentage = dto.discountPercentage || 0;
    const taxPercentage = dto.taxPercentage || 0;
    const { subtotal, total, items } = this.calculateQuoteTotals(dto.lineItems, discountPercentage, taxPercentage);

    // 4. Enforce approval rules (> 20% discount requires authorization)
    const requiresApproval = discountPercentage > 20.00;

    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          organizationId: orgId,
          opportunityId: dto.opportunityId,
          version,
          discountPercentage: new Prisma.Decimal(discountPercentage),
          taxPercentage: new Prisma.Decimal(taxPercentage),
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(total),
          status: QuotationStatus.DRAFT,
          expiresAt: new Date(dto.expiresAt),
          requiresApproval,
          approved: false,
          createdBy: actorUserId,
        },
      });

      // Save line items
      const lineItemData = items.map((item) => ({
        quotationId: quotation.id,
        itemName: item.itemName,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        subtotal: new Prisma.Decimal(item.subtotal),
      }));

      await tx.quoteLineItem.createMany({
        data: lineItemData,
      });

      // Write audit log
      const fullQuote = await tx.quotation.findUnique({
        where: { id: quotation.id },
        include: { lineItems: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'quotation.create',
          resourceName: 'quotation',
          resourceId: quotation.id,
          payloadAfter: fullQuote as any,
        },
      });

      return fullQuote;
    });
  }

  /**
   * Update an existing quotation (restricted to DRAFT status)
   */
  async updateQuotation(id: string, dto: UpdateQuotationDto, orgId: string, actorUserId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { lineItems: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Locked quotations in sent, approved or expired states cannot be modified');
    }

    const discountPercentage = dto.discountPercentage !== undefined ? dto.discountPercentage : Number(quotation.discountPercentage);
    const taxPercentage = dto.taxPercentage !== undefined ? dto.taxPercentage : Number(quotation.taxPercentage);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : quotation.expiresAt;

    // Use current line items if none were sent in update payload
    const rawLineItems = dto.lineItems || quotation.lineItems.map((item) => ({
      itemName: item.itemName,
      description: item.description || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    }));

    const { subtotal, total, items } = this.calculateQuoteTotals(rawLineItems, discountPercentage, taxPercentage);
    const requiresApproval = discountPercentage > 20.00;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update quotation metadata
      const updatedQuotation = await tx.quotation.update({
        where: { id },
        data: {
          discountPercentage: new Prisma.Decimal(discountPercentage),
          taxPercentage: new Prisma.Decimal(taxPercentage),
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(total),
          expiresAt,
          requiresApproval,
          approved: requiresApproval ? false : quotation.approved, // Reset approval if discount is updated to > 20%
          updatedBy: actorUserId,
        },
      });

      // 2. Refresh line items if updated
      if (dto.lineItems) {
        await tx.quoteLineItem.deleteMany({ where: { quotationId: id } });
        const lineItemData = items.map((item) => ({
          quotationId: id,
          itemName: item.itemName,
          description: item.description || null,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          subtotal: new Prisma.Decimal(item.subtotal),
        }));
        await tx.quoteLineItem.createMany({ data: lineItemData });
      }

      const fullQuote = await tx.quotation.findUnique({
        where: { id },
        include: { lineItems: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'quotation.update',
          resourceName: 'quotation',
          resourceId: id,
          payloadBefore: quotation as any,
          payloadAfter: fullQuote as any,
        },
      });

      return fullQuote;
    });
  }

  /**
   * List quotations for an opportunity or all in organization
   */
  async listQuotations(orgId: string, opportunityId?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId: orgId, deletedAt: null };
    if (opportunityId) {
      where.opportunityId = opportunityId;
    }

    const [total, data] = await Promise.all([
      this.prisma.quotation.count({ where }),
      this.prisma.quotation.findMany({
        where,
        orderBy: { version: 'desc' },
        skip,
        take: limit,
        include: { lineItems: true },
      }),
    ]);

    return { total, data };
  }

  /**
   * Get detail of a specific quotation
   */
  async getQuotationById(id: string, orgId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { lineItems: true, opportunity: true },
    });
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    return quotation;
  }

  /**
   * Approve a high-discount quotation (requires quotations:approve permission)
   */
  async approveQuotation(id: string, orgId: string, actorUserId: string, userRole: string, userPermissions: string[]) {
    const hasApproveAccess =
      userRole === 'SuperAdmin' ||
      userRole === 'TenantAdmin' ||
      userPermissions.includes('quotations:approve');

    if (!hasApproveAccess) {
      throw new ForbiddenException('You do not have permission to approve quotations');
    }

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        approved: true,
        approvedById: actorUserId,
        approvedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'quotation.approved',
        resourceName: 'quotation',
        resourceId: id,
        payloadAfter: updated as any,
      },
    });

    return updated;
  }

  /**
   * Transition quotation status (blocks APPROVED transitions if discount > 20% is unapproved)
   */
  async transitionStatus(
    id: string,
    dto: TransitionQuotationStatusDto,
    orgId: string,
    actorUserId: string,
    userRole: string,
    userPermissions: string[],
  ) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    // Enforce lock boundaries (approved/expired can only be overridden by admin)
    const isLocked = quotation.status === QuotationStatus.APPROVED || quotation.status === QuotationStatus.EXPIRED;
    const hasOverrideAccess = userRole === 'SuperAdmin' || userRole === 'TenantAdmin';
    if (isLocked && !hasOverrideAccess) {
      throw new BadRequestException('Historical approved or expired quotations are locked and cannot be changed');
    }

    // If target status is APPROVED:
    if (dto.status === QuotationStatus.APPROVED) {
      if (quotation.requiresApproval && !quotation.approved) {
        throw new BadRequestException('Quotation discount exceeds 20% and requires administrative approval');
      }

      // Atomically: mark quotation as APPROVED, update Opportunity amount, and deactivate other APPROVED quotes
      return this.prisma.$transaction(async (tx) => {
        const approvedQuote = await tx.quotation.update({
          where: { id },
          data: { status: QuotationStatus.APPROVED, updatedBy: actorUserId },
        });

        // Update opportunity value
        await tx.opportunity.update({
          where: { id: quotation.opportunityId },
          data: { amount: quotation.total },
        });

        // Demote other APPROVED quotes for the same opportunity to SENT
        await tx.quotation.updateMany({
          where: {
            opportunityId: quotation.opportunityId,
            id: { not: id },
            status: QuotationStatus.APPROVED,
            deletedAt: null,
          },
          data: { status: QuotationStatus.SENT },
        });

        // Create audit logs
        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId: actorUserId,
            action: 'quotation.status_changed',
            resourceName: 'quotation',
            resourceId: id,
            payloadBefore: { status: quotation.status },
            payloadAfter: { status: QuotationStatus.APPROVED },
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId: actorUserId,
            action: 'opportunity.amount_modified',
            resourceName: 'opportunity',
            resourceId: quotation.opportunityId,
            payloadAfter: { amount: quotation.total },
          },
        });

        return approvedQuote;
      });
    }

    // Standard status transition (DRAFT -> SENT or EXPIRED)
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status: dto.status, updatedBy: actorUserId },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'quotation.status_changed',
        resourceName: 'quotation',
        resourceId: id,
        payloadBefore: { status: quotation.status },
        payloadAfter: { status: dto.status },
      },
    });

    return updated;
  }

  /**
   * Delete a quotation (only permitted in DRAFT status)
   */
  async deleteQuotation(id: string, orgId: string, actorUserId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be deleted');
    }

    const deleted = await this.prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorUserId },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'quotation.delete',
        resourceName: 'quotation',
        resourceId: id,
        payloadBefore: quotation as any,
      },
    });

    return { success: true };
  }
}
