import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(role: string): Promise<any> {
    // 1. If user is an Administrator (SuperAdmin or TenantAdmin)
    if (role === 'SuperAdmin' || role === 'TenantAdmin') {
      const userCount = await this.prisma.userOrganization.count({
        where: { deletedAt: null },
      });

      return {
        role,
        userCount,
        leads: { total: 128, conversionRate: '24.5%', growth: '+12%' },
        pipeline: { value: '$420,000', deals: 18 },
        billing: { revenue: '$12,400', status: 'Invoiced' },
        tickets: { open: 5, resolved: 42 },
      };
    }

    // 2. If user is a Sales Representative
    if (role === 'SalesRepresentative') {
      return {
        role,
        leads: { total: 64, conversionRate: '18.2%' },
        pipeline: { value: '$185,000', deals: 7 },
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
