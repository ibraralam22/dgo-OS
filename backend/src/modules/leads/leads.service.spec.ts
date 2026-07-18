import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

const mockPrisma = {
  lead: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLead', () => {
    it('should create lead and write audit log', async () => {
      const dto: CreateLeadDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
        phone: '123456',
        companyName: 'Acme Corp',
        website: 'acme.com',
        source: 'website',
        status: 'new',
        score: 50,
        budget: 1000,
        ownerId: 'owner-uuid-1',
      };

      const mockLead = { id: 'lead-uuid-1', ...dto };
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.createLead(dto, 'org-uuid-1', 'actor-uuid-1');

      expect(result).toEqual(mockLead);
      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-uuid-1',
          ownerId: 'owner-uuid-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@doe.com',
          phone: '123456',
          companyName: 'Acme Corp',
          website: 'acme.com',
          source: 'website',
          status: 'new',
          score: 50,
          budget: 1000,
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'lead.create',
          resourceName: 'lead',
          resourceId: 'lead-uuid-1',
        }),
      });
    });
  });

  describe('listLeads', () => {
    it('should return paginated leads list and total count', async () => {
      const mockLeadsList = [{ id: 'lead-1', firstName: 'John' }];
      mockPrisma.lead.findMany.mockResolvedValue(mockLeadsList);
      mockPrisma.lead.count.mockResolvedValue(1);

      const result = await service.listLeads('org-1', {
        page: 1,
        limit: 10,
        search: 'John',
        status: 'new',
      });

      expect(result.data).toEqual(mockLeadsList);
      expect(result.total).toBe(1);
      expect(prisma.lead.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: 'org-1',
          deletedAt: null,
          status: 'new',
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    });
  });

  describe('getLead', () => {
    it('should return lead if found', async () => {
      const mockLead = { id: 'lead-1', firstName: 'John' };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      const result = await service.getLead('lead-1', 'org-1');

      expect(result).toEqual(mockLead);
      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: { id: 'lead-1', organizationId: 'org-1', deletedAt: null },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.getLead('lead-1', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLead', () => {
    it('should update lead fields and log updates', async () => {
      const mockLead = { id: 'lead-1', firstName: 'John', organizationId: 'org-1', deletedAt: null };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      const updateDto: UpdateLeadDto = { firstName: 'Johnny' };
      const updatedMockLead = { ...mockLead, firstName: 'Johnny' };
      mockPrisma.lead.update.mockResolvedValue(updatedMockLead);

      const result = await service.updateLead('lead-1', updateDto, 'org-1', 'actor-1');

      expect(result.firstName).toBe('Johnny');
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: expect.objectContaining({
          firstName: 'Johnny',
        }),
      });
    });
  });

  describe('convertLead', () => {
    it('should convert lead successfully setting convertedAt date', async () => {
      const mockLead = { id: 'lead-1', status: 'qualified', organizationId: 'org-1', deletedAt: null };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      const updatedLead = { ...mockLead, status: 'converted', convertedAt: new Date() };
      mockPrisma.lead.update.mockResolvedValue(updatedLead);

      const result = await service.convertLead('lead-1', 'org-1', 'actor-1');

      expect(result.status).toBe('converted');
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: expect.objectContaining({
          status: 'converted',
          convertedAt: expect.any(Date),
        }),
      });
    });

    it('should throw BadRequestException if already converted', async () => {
      const mockLead = { id: 'lead-1', status: 'converted', organizationId: 'org-1', deletedAt: null };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      await expect(service.convertLead('lead-1', 'org-1', 'actor-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteLead', () => {
    it('should soft-delete lead successfully setting deletedAt', async () => {
      const mockLead = { id: 'lead-1', organizationId: 'org-1', deletedAt: null };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      const deletedLead = { ...mockLead, deletedAt: new Date() };
      mockPrisma.lead.update.mockResolvedValue(deletedLead);

      const result = await service.deleteLead('lead-1', 'org-1', 'actor-1');

      expect(result.deletedAt).toBeDefined();
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: {
          deletedAt: expect.any(Date),
        },
      });
    });
  });
});
