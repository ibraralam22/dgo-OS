import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

const TICKET_INCLUDE = {
  account: { select: { id: true, name: true, domain: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List Tickets ────────────────────────────────────────────────────────────

  async listTickets(
    orgId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      priority?: string;
      category?: string;
      assignedToId?: string;
      search?: string;
    },
    userRole: string,
    userEmail: string,
  ) {
    const skip = (query.page - 1) * query.limit;
    const where: any = { organizationId: orgId, deletedAt: null };

    // Scoping for Client Contacts
    if (userRole === 'ClientContact') {
      const accountId = await this.getClientAccountId(userEmail, orgId);
      if (!accountId) {
        return { total: 0, data: [] };
      }
      where.accountId = accountId;
    } else {
      if (query.assignedToId) where.assignedToId = query.assignedToId;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;

    if (query.search) {
      where.subject = { contains: query.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
        include: {
          account: { select: { id: true, name: true, domain: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    return { total, data };
  }

  // ─── Get Summary KPIs ────────────────────────────────────────────────────────

  async getSummary(orgId: string, userRole: string, userEmail: string) {
    const where: any = { organizationId: orgId, deletedAt: null };

    if (userRole === 'ClientContact') {
      const accountId = await this.getClientAccountId(userEmail, orgId);
      if (!accountId) {
        return { openTickets: 0, inProgressTickets: 0, resolvedTickets: 0, closedTickets: 0 };
      }
      where.accountId = accountId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      select: { status: true, priority: true },
    });

    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let highPriorityUnresolved = 0;

    for (const t of tickets) {
      if (t.status === 'OPEN') openCount++;
      if (t.status === 'IN_PROGRESS') inProgressCount++;
      if (t.status === 'RESOLVED') resolvedCount++;
      if (t.status === 'CLOSED') closedCount++;

      if (['OPEN', 'IN_PROGRESS'].includes(t.status) && ['HIGH', 'URGENT'].includes(t.priority)) {
        highPriorityUnresolved++;
      }
    }

    return {
      openTickets: openCount,
      inProgressTickets: inProgressCount,
      resolvedTickets: resolvedCount,
      closedTickets: closedCount,
      highPriorityUnresolved,
    };
  }

  // ─── Get Detail ──────────────────────────────────────────────────────────────

  async getTicketById(id: string, orgId: string, userRole: string, userEmail: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: TICKET_INCLUDE,
    });

    if (!ticket) throw new NotFoundException(`Ticket with ID ${id} not found`);

    if (userRole === 'ClientContact') {
      const clientAccountId = await this.getClientAccountId(userEmail, orgId);
      if (ticket.accountId !== clientAccountId) {
        throw new ForbiddenException('Access denied to this ticket resource');
      }
    }

    return ticket;
  }

  // ─── Log Ticket ──────────────────────────────────────────────────────────────

  async createTicket(dto: CreateTicketDto, orgId: string, actorId: string, userRole: string, userEmail: string) {
    let accountId = dto.accountId;

    if (userRole === 'ClientContact') {
      const clientAccountId = await this.getClientAccountId(userEmail, orgId);
      if (!clientAccountId) {
        throw new BadRequestException('Your profile is not mapped to any B2B Client Account.');
      }
      accountId = clientAccountId;
    } else {
      // Admin/Rep - verify account exists
      const accountExists = await this.prisma.account.findFirst({
        where: { id: accountId, organizationId: orgId, deletedAt: null },
      });
      if (!accountExists) {
        throw new BadRequestException(`Client Account with ID ${accountId} not found`);
      }
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        organizationId: orgId,
        accountId,
        subject: dto.subject,
        description: dto.description,
        priority: (dto.priority as any) || 'MEDIUM',
        category: (dto.category as any) || 'GENERAL',
        status: 'OPEN',
        createdById: actorId,
      },
      include: TICKET_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'ticket.create', ticket.id, null, ticket);
    return ticket;
  }

  // ─── Update Ticket ───────────────────────────────────────────────────────────

  async updateTicket(
    id: string,
    dto: UpdateTicketDto,
    orgId: string,
    actorId: string,
    userRole: string,
    userEmail: string,
  ) {
    const existing = await this.getTicketById(id, orgId, userRole, userEmail);

    // Client contact constraints
    if (userRole === 'ClientContact') {
      if (dto.assignedToId !== undefined) {
        throw new ForbiddenException('Client Contacts are not authorized to assign agents');
      }
    }

    if (dto.assignedToId) {
      const agent = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, deletedAt: null },
      });
      if (!agent) throw new BadRequestException(`Assigned user not found`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: (dto.status as any) || undefined,
        priority: (dto.priority as any) || undefined,
        category: (dto.category as any) || undefined,
        assignedToId: dto.assignedToId || undefined,
      },
      include: TICKET_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'ticket.update', id, existing, updated);
    return updated;
  }

  // ─── Post Comment reply ──────────────────────────────────────────────────────

  async createComment(
    ticketId: string,
    dto: CreateCommentDto,
    orgId: string,
    actorId: string,
    userRole: string,
    userEmail: string,
  ) {
    const ticket = await this.getTicketById(ticketId, orgId, userRole, userEmail);

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          organizationId: orgId,
          ticketId,
          userId: actorId,
          comment: dto.comment,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // Update ticket updated timestamp & trigger status reopening if customer posts comment on resolved ticket
      let statusUpdate: any = {};
      if (userRole === 'ClientContact' && ['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        statusUpdate.status = 'IN_PROGRESS';
      }

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          updatedAt: new Date(),
          ...statusUpdate,
        },
      });

      return comment;
    });
  }

  // ─── Delete Ticket ───────────────────────────────────────────────────────────

  async deleteTicket(id: string, orgId: string, actorId: string, userRole: string, userEmail: string) {
    const existing = await this.getTicketById(id, orgId, userRole, userEmail);

    if (userRole === 'ClientContact') {
      throw new ForbiddenException('Client Contacts are not authorized to delete tickets');
    }

    await this.prisma.ticket.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.writeAudit(orgId, actorId, 'ticket.delete', id, existing, null);
    return { success: true };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async getClientAccountId(email: string, orgId: string): Promise<string | null> {
    const contact = await this.prisma.contact.findFirst({
      where: { email, organizationId: orgId, deletedAt: null },
    });
    return contact ? contact.accountId : null;
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
        resourceName: 'ticket',
        resourceId,
        payloadBefore: before ?? undefined,
        payloadAfter: after ?? undefined,
      },
    });
  }
}
