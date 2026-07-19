import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSavedReportDto } from './dto/create-saved-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Sales Pipeline Analytics ───────────────────────────────────────────────

  async getSalesAnalytics(orgId: string, fromDate?: string, toDate?: string) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [totals, stageGroups, closedWonCount, closedLostCount] = await Promise.all([
      this.prisma.opportunity.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
      }),
      this.prisma.opportunity.groupBy({
        by: ['stage'],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.opportunity.count({
        where: { ...where, stage: 'CLOSED_WON' },
      }),
      this.prisma.opportunity.count({
        where: { ...where, stage: 'CLOSED_LOST' },
      }),
    ]);

    const totalDeals = totals._count || 0;
    const closedDecided = closedWonCount + closedLostCount;
    const winRate = closedDecided > 0 ? (closedWonCount / closedDecided) * 100 : 0;

    return {
      totalDeals,
      pipelineValue: Number(totals._sum.amount || 0),
      averageDealSize: Number(totals._avg.amount || 0),
      winRate: parseFloat(winRate.toFixed(1)),
      stages: stageGroups.map((group) => ({
        stage: group.stage,
        count: group._count,
        value: Number(group._sum.amount || 0),
      })),
    };
  }

  // ─── Financial Performance Analytics ─────────────────────────────────────────

  async getFinancialAnalytics(orgId: string, fromDate?: string, toDate?: string) {
    const where: any = { organizationId: orgId, deletedAt: null, status: { not: 'VOID' } };
    const paymentWhere: any = { organizationId: orgId, deletedAt: null, status: 'SUCCESS' };

    if (fromDate || toDate) {
      where.issueDate = {};
      paymentWhere.paymentDate = {};
      if (fromDate) {
        where.issueDate.gte = new Date(fromDate);
        paymentWhere.paymentDate.gte = new Date(fromDate);
      }
      if (toDate) {
        where.issueDate.lte = new Date(toDate);
        paymentWhere.paymentDate.lte = new Date(toDate);
      }
    }

    const [totals, statusGroups, paymentMethodGroups] = await Promise.all([
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          total: true,
          amountPaid: true,
          balanceDue: true,
        },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { organizationId: orgId, deletedAt: null },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: paymentWhere,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      invoicesCount: totals._count || 0,
      totalBilled: Number(totals._sum.total || 0),
      totalPaid: Number(totals._sum.amountPaid || 0),
      totalOutstanding: Number(totals._sum.balanceDue || 0),
      statuses: statusGroups.map((group) => ({
        status: group.status,
        count: group._count,
      })),
      paymentMethods: paymentMethodGroups.map((group) => ({
        method: group.paymentMethod,
        count: group._count,
        value: Number(group._sum.amount || 0),
      })),
    };
  }

  // ─── Service Desk Support Analytics ──────────────────────────────────────────

  async getSupportAnalytics(orgId: string, fromDate?: string, toDate?: string) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [statusGroups, priorityGroups, categoryGroups] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.ticket.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    return {
      statuses: statusGroups.map((group) => ({
        status: group.status,
        count: group._count,
      })),
      priorities: priorityGroups.map((group) => ({
        priority: group.priority,
        count: group._count,
      })),
      categories: categoryGroups.map((group) => ({
        category: group.category,
        count: group._count,
      })),
    };
  }

  // ─── Saved Configurations CRUD ──────────────────────────────────────────────

  async listSavedReports(orgId: string) {
    return this.prisma.savedReport.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async createSavedReport(orgId: string, createdById: string, dto: CreateSavedReportDto) {
    return this.prisma.savedReport.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description || null,
        category: dto.category as any,
        config: dto.config,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async deleteSavedReport(id: string, orgId: string) {
    const report = await this.prisma.savedReport.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });

    if (!report) {
      throw new NotFoundException(`Saved Report with ID ${id} not found`);
    }

    await this.prisma.savedReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
