import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  async createLead(dto: CreateLeadDto, orgId: string, actorUserId: string) {
    const lead = await this.prisma.lead.create({
      data: {
        organizationId: orgId,
        ownerId: dto.ownerId || null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone || null,
        companyName: dto.companyName,
        website: dto.website || null,
        source: dto.source,
        status: dto.status || 'new',
        score: dto.score ?? 0,
        budget: dto.budget || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'lead.create',
        resourceName: 'lead',
        resourceId: lead.id,
        payloadAfter: lead as any,
      },
    });

    await this.notify(lead, orgId, actorUserId, 'created');

    return lead;
  }

  async listLeads(
    orgId: string,
    options: { page: number; limit: number; search?: string; status?: string },
  ) {
    const { page, limit, search, status } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total };
  }

  async getLead(id: string, orgId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead record not found');
    }

    return lead;
  }

  async updateLead(
    id: string,
    dto: UpdateLeadDto,
    orgId: string,
    actorUserId: string,
  ) {
    const lead = await this.getLead(id, orgId);

    const updatedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        ownerId: dto.ownerId !== undefined ? dto.ownerId : lead.ownerId,
        firstName: dto.firstName !== undefined ? dto.firstName : lead.firstName,
        lastName: dto.lastName !== undefined ? dto.lastName : lead.lastName,
        email: dto.email !== undefined ? dto.email : lead.email,
        phone: dto.phone !== undefined ? dto.phone : lead.phone,
        companyName: dto.companyName !== undefined ? dto.companyName : lead.companyName,
        website: dto.website !== undefined ? dto.website : lead.website,
        source: dto.source !== undefined ? dto.source : lead.source,
        status: dto.status !== undefined ? dto.status : lead.status,
        score: dto.score !== undefined ? dto.score : lead.score,
        budget: dto.budget !== undefined ? dto.budget : lead.budget,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'lead.update',
        resourceName: 'lead',
        resourceId: lead.id,
        payloadBefore: lead as any,
        payloadAfter: updatedLead as any,
      },
    });

    await this.notify(updatedLead, orgId, actorUserId, 'updated');

    return updatedLead;
  }

  async convertLead(id: string, orgId: string, actorUserId: string) {
    const lead = await this.getLead(id, orgId);

    if (lead.status === 'converted') {
      throw new BadRequestException('Lead record has already been converted');
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'converted',
        convertedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'lead.convert',
        resourceName: 'lead',
        resourceId: lead.id,
        payloadBefore: lead as any,
        payloadAfter: updatedLead as any,
      },
    });

    await this.notify(updatedLead, orgId, actorUserId, 'converted');

    return updatedLead;
  }

  async deleteLead(id: string, orgId: string, actorUserId: string) {
    const lead = await this.getLead(id, orgId);

    const deletedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'lead.delete',
        resourceName: 'lead',
        resourceId: lead.id,
        payloadBefore: lead as any,
      },
    });

    await this.notify(deletedLead, orgId, actorUserId, 'deleted');

    return deletedLead;
  }

  private async notify(lead: { id: string; ownerId: string | null; companyName: string }, orgId: string, actorId: string, action: string): Promise<void> {
    await this.notifications?.createActivity({ organizationId: orgId, actorId, recipientIds: lead.ownerId ? [lead.ownerId] : [], resourceType: 'lead', resourceId: lead.id, title: `Lead ${action}`, body: lead.companyName, dedupeKey: `lead:${lead.id}:${action}:${Date.now()}` });
  }
}
