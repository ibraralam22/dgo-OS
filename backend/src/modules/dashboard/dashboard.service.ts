import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(role: string): Promise<any> {
    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(val);
    };

    // Calculate active deals metrics
    const activeDeals = await this.prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        stage: {
          in: ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION'],
        },
      },
      select: {
        amount: true,
      },
    });

    const dealsCount = activeDeals.length;
    const totalAmount = activeDeals.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

    // Calculate leads count
    const totalLeads = await this.prisma.lead.count({
      where: { deletedAt: null },
    });

    const convertedLeads = await this.prisma.lead.count({
      where: { deletedAt: null, status: 'converted' },
    });

    const conversionRate = totalLeads > 0 
      ? `${((convertedLeads / totalLeads) * 100).toFixed(1)}%`
      : '0.0%';

    // 1. If user is an Administrator (SuperAdmin or TenantAdmin)
    if (role === 'SuperAdmin' || role === 'TenantAdmin') {
      const userCount = await this.prisma.userOrganization.count({
        where: { deletedAt: null },
      });

      return {
        role,
        userCount,
        leads: { total: totalLeads, conversionRate, growth: '+12%' },
        pipeline: { value: formatCurrency(totalAmount), deals: dealsCount },
        billing: { revenue: '$12,400', status: 'Invoiced' },
        tickets: { open: 5, resolved: 42 },
      };
    }

    // 2. If user is a Sales Representative
    if (role === 'SalesRepresentative') {
      return {
        role,
        leads: { total: totalLeads, conversionRate },
        pipeline: { value: formatCurrency(totalAmount), deals: dealsCount },
      };
    }

    // 3. If user is a Client Contact
    if (role === 'ClientContact') {
      return {
        role,
        tickets: { open: 2, resolved: 14, slaStatus: '98.2%' },
      };
    }

    // 4. Default minimal stats for standard/unrecognized roles
    return {
      role,
    };
  }

  async getActivity(): Promise<any[]> {
    // Fetch last 5 audit logs in the tenant organization (RLS automatically injects organizationId scoping)
    return this.prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        resourceName: true,
        resourceId: true,
        payloadBefore: true,
        payloadAfter: true,
        ipAddress: true,
        createdAt: true,
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
