import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { AccountStatus, ContactStatus } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // Accounts CRUD
  // -------------------------------------------------------------

  async createAccount(dto: CreateAccountDto, orgId: string, actorUserId: string) {
    if (dto.parentAccountId) {
      const parent = await this.prisma.account.findFirst({
        where: { id: dto.parentAccountId, organizationId: orgId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException(`Parent account ${dto.parentAccountId} not found`);
      }
    }

    const account = await this.prisma.account.create({
      data: {
        ...dto,
        organizationId: orgId,
        createdBy: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'account.create',
        resourceName: 'account',
        resourceId: account.id,
        payloadAfter: account as any,
      },
    });

    return account;
  }

  async getAccounts(orgId: string, page = 1, limit = 10, search = '', status?: string) {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.account.count({ where: whereClause }),
      this.prisma.account.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          parentAccount: { select: { id: true, name: true } },
          _count: { select: { contacts: true } },
        },
      }),
    ]);

    return { total, data };
  }

  async getAccountById(id: string, orgId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        parentAccount: { select: { id: true, name: true } },
        contacts: { where: { deletedAt: null } },
      },
    });
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    return account;
  }

  async updateAccount(id: string, dto: UpdateAccountDto, orgId: string, actorUserId: string) {
    const account = await this.getAccountById(id, orgId);

    if (dto.parentAccountId) {
      if (dto.parentAccountId === id) {
        throw new BadRequestException('An account cannot be its own parent');
      }

      const parent = await this.prisma.account.findFirst({
        where: { id: dto.parentAccountId, organizationId: orgId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException(`Parent account ${dto.parentAccountId} not found`);
      }

      // Check circular reference
      const isCircular = await this.checkCircularHierarchy(id, dto.parentAccountId, orgId);
      if (isCircular) {
        throw new BadRequestException('Circular hierarchy reference detected');
      }
    }

    const { contacts, ...payloadBefore } = account;

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: actorUserId,
      },
    });

    const isParentChanged = account.parentAccountId !== updatedAccount.parentAccountId;

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: isParentChanged ? 'account.hierarchy.update' : 'account.update',
        resourceName: 'account',
        resourceId: id,
        payloadBefore: payloadBefore as any,
        payloadAfter: updatedAccount as any,
      },
    });

    return updatedAccount;
  }

  async deleteAccount(id: string, orgId: string, actorUserId: string) {
    const account = await this.getAccountById(id, orgId);

    const { contacts, ...payloadBefore } = account;

    // Use a transaction to soft-delete the account and cascade to its contacts
    const [deletedAccount] = await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorUserId },
      }),
      this.prisma.contact.updateMany({
        where: { accountId: id, organizationId: orgId, deletedAt: null },
        data: { deletedAt: new Date(), updatedBy: actorUserId },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'account.delete',
        resourceName: 'account',
        resourceId: id,
        payloadBefore: payloadBefore as any,
      },
    });

    return deletedAccount;
  }

  // Helper to build hierarchy and check circular reference
  private async checkCircularHierarchy(accountId: string, newParentId: string, orgId: string): Promise<boolean> {
    // Single recursive CTE query to get all ancestors of newParentId in one database roundtrip
    const ancestors = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH RECURSIVE ancestors AS (
        SELECT id, "parentAccountId"
        FROM accounts
        WHERE id = ${newParentId}::uuid AND "organizationId" = ${orgId}::uuid AND "deletedAt" IS NULL
        
        UNION ALL
        
        SELECT a.id, a."parentAccountId"
        FROM accounts a
        INNER JOIN ancestors an ON a.id = an."parentAccountId"
        WHERE a."organizationId" = ${orgId}::uuid AND a."deletedAt" IS NULL
      )
      SELECT id FROM ancestors;
    `;

    return ancestors.some((anc) => anc.id === accountId);
  }

  // Get Recursive Hierarchy Tree (Optimized using SQL CTEs to avoid N+1 queries and full table scans)
  async getAccountHierarchy(id: string, orgId: string) {
    // 1. Trace the parent chain up to find the ultimate root parent node in a single DB request
    const rootSearch = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH RECURSIVE ancestors AS (
        SELECT id, "parentAccountId", 1 as depth
        FROM accounts
        WHERE id = ${id}::uuid AND "organizationId" = ${orgId}::uuid AND "deletedAt" IS NULL
        
        UNION ALL
        
        SELECT a.id, a."parentAccountId", an.depth + 1
        FROM accounts a
        INNER JOIN ancestors an ON a.id = an."parentAccountId"
        WHERE a."organizationId" = ${orgId}::uuid AND a."deletedAt" IS NULL
      )
      SELECT id FROM ancestors ORDER BY depth DESC LIMIT 1;
    `;

    if (rootSearch.length === 0) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    const rootId = rootSearch[0].id;

    // 2. Fetch the complete downward tree starting from the rootId to unlimited depth
    const flatTree = await this.prisma.$queryRaw<Array<{ id: string; name: string; domain: string; parentAccountId: string | null }>>`
      WITH RECURSIVE descendants AS (
        SELECT id, name, domain, "parentAccountId"
        FROM accounts
        WHERE id = ${rootId}::uuid AND "organizationId" = ${orgId}::uuid AND "deletedAt" IS NULL
        
        UNION ALL
        
        SELECT a.id, a.name, a.domain, a."parentAccountId"
        FROM accounts a
        INNER JOIN descendants d ON a."parentAccountId" = d.id
        WHERE a."organizationId" = ${orgId}::uuid AND a."deletedAt" IS NULL
      )
      SELECT id, name, domain, "parentAccountId" FROM descendants;
    `;

    if (flatTree.length === 0) {
      throw new NotFoundException(`Account tree not found`);
    }

    // 3. Rebuild the hierarchical nested tree structure in-memory in O(N) linear time
    const nodesMap = new Map<string, any>();
    flatTree.forEach((row) => {
      nodesMap.set(row.id, {
        id: row.id,
        name: row.name,
        domain: row.domain,
        parentAccountId: row.parentAccountId,
        subsidiaries: [],
      });
    });

    let rootNode: any = null;
    flatTree.forEach((row) => {
      const node = nodesMap.get(row.id);
      if (row.parentAccountId && nodesMap.has(row.parentAccountId)) {
        const parent = nodesMap.get(row.parentAccountId);
        parent.subsidiaries.push(node);
      } else {
        if (row.id === rootId) {
          rootNode = node;
        }
      }
    });

    return rootNode || nodesMap.get(rootId);
  }

  // -------------------------------------------------------------
  // Contacts CRUD
  // -------------------------------------------------------------

  async createContact(dto: CreateContactDto, orgId: string, actorUserId: string) {
    // Verify Account exists
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, organizationId: orgId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    // Check unique email per organization
    const existing = await this.prisma.contact.findFirst({
      where: { email: dto.email, organizationId: orgId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Contact with email ${dto.email} already exists in this organization`);
    }

    let contact: any;

    if (dto.isPrimaryBilling) {
      contact = await this.prisma.$transaction(async (tx) => {
        // Reset existing primary contacts in same account
        await tx.contact.updateMany({
          where: { accountId: dto.accountId, organizationId: orgId, isPrimaryBilling: true, deletedAt: null },
          data: { isPrimaryBilling: false },
        });

        return tx.contact.create({
          data: {
            ...dto,
            organizationId: orgId,
            createdBy: actorUserId,
          },
        });
      });
    } else {
      contact = await this.prisma.contact.create({
        data: {
          ...dto,
          organizationId: orgId,
          createdBy: actorUserId,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: dto.isPrimaryBilling ? 'contact.primary-billing.assigned' : 'contact.create',
        resourceName: 'contact',
        resourceId: contact.id,
        payloadAfter: contact as any,
      },
    });

    return contact;
  }

  async getContacts(orgId: string, accountId?: string, page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (accountId) {
      whereClause.accountId = accountId;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.contact.count({ where: whereClause }),
      this.prisma.contact.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          account: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { total, data };
  }

  async getContactById(id: string, orgId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        account: { select: { id: true, name: true } },
      },
    });
    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }
    return contact;
  }

  async updateContact(id: string, dto: UpdateContactDto, orgId: string, actorUserId: string) {
    const contact = await this.getContactById(id, orgId);

    if (dto.accountId && dto.accountId !== contact.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, organizationId: orgId, deletedAt: null },
      });
      if (!account) {
        throw new NotFoundException(`Account ${dto.accountId} not found`);
      }
    }

    if (dto.email && dto.email !== contact.email) {
      const existing = await this.prisma.contact.findFirst({
        where: { email: dto.email, organizationId: orgId, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Contact with email ${dto.email} already exists in this organization`);
      }
    }

    let updatedContact: any;

    if (dto.isPrimaryBilling && !contact.isPrimaryBilling) {
      updatedContact = await this.prisma.$transaction(async (tx) => {
        // Reset existing primary contacts in same account
        await tx.contact.updateMany({
          where: { accountId: dto.accountId || contact.accountId, organizationId: orgId, isPrimaryBilling: true, deletedAt: null },
          data: { isPrimaryBilling: false },
        });

        return tx.contact.update({
          where: { id },
          data: {
            ...dto,
            updatedBy: actorUserId,
          },
        });
      });
    } else {
      updatedContact = await this.prisma.contact.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: actorUserId,
        },
      });
    }

    const actionType = dto.isPrimaryBilling && !contact.isPrimaryBilling 
      ? 'contact.primary-billing.assigned' 
      : 'contact.update';

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: actionType,
        resourceName: 'contact',
        resourceId: id,
        payloadBefore: contact as any,
        payloadAfter: updatedContact as any,
      },
    });

    return updatedContact;
  }

  async setPrimaryBillingContact(id: string, orgId: string, actorUserId: string) {
    const contact = await this.getContactById(id, orgId);

    const updatedContact = await this.prisma.$transaction(async (tx) => {
      // Reset existing primary billing contacts
      await tx.contact.updateMany({
        where: { accountId: contact.accountId, organizationId: orgId, isPrimaryBilling: true, deletedAt: null },
        data: { isPrimaryBilling: false },
      });

      return tx.contact.update({
        where: { id },
        data: { isPrimaryBilling: true, updatedBy: actorUserId },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'contact.primary-billing.assigned',
        resourceName: 'contact',
        resourceId: id,
        payloadBefore: contact as any,
        payloadAfter: updatedContact as any,
      },
    });

    return updatedContact;
  }

  async deleteContact(id: string, orgId: string, actorUserId: string) {
    const contact = await this.getContactById(id, orgId);

    const deletedContact = await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorUserId },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorUserId,
        action: 'contact.delete',
        resourceName: 'contact',
        resourceId: id,
        payloadBefore: contact as any,
      },
    });

    return deletedContact;
  }
}
