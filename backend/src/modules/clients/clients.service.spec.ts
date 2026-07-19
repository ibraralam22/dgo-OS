import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateContactDto } from './dto/create-contact.dto';

const mockPrisma = {
  account: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  contact: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callbackOrArray) => {
    if (typeof callbackOrArray === 'function') {
      return callbackOrArray(mockPrisma);
    }
    return Promise.all(callbackOrArray);
  }),
};

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    it('should create account and log audit event', async () => {
      const dto: CreateAccountDto = {
        name: 'ACME Corp',
        domain: 'acme.com',
        industry: 'Tech',
        employeeCount: 100,
        annualRevenue: 500000,
        billingStreet: '123 Main St',
        billingCity: 'New York',
        billingCountry: 'US',
      };

      const mockAccount = { id: 'account-1', ...dto };
      mockPrisma.account.create.mockResolvedValue(mockAccount);

      const result = await service.createAccount(dto, 'org-1', 'user-1');

      expect(result).toEqual(mockAccount);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          organizationId: 'org-1',
          createdBy: 'user-1',
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('createContact', () => {
    it('should throw ConflictException if contact email already exists', async () => {
      const dto: CreateContactDto = {
        accountId: 'account-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@acme.com',
        isPrimaryBilling: false,
      };

      mockPrisma.account.findFirst.mockResolvedValue({ id: 'account-1' });
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'contact-1', email: 'john@acme.com' });

      await expect(service.createContact(dto, 'org-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should reset other primary contacts inside a transaction if isPrimaryBilling is true', async () => {
      const dto: CreateContactDto = {
        accountId: 'account-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@acme.com',
        isPrimaryBilling: true,
      };

      mockPrisma.account.findFirst.mockResolvedValue({ id: 'account-1' });
      mockPrisma.contact.findFirst.mockResolvedValue(null); // email free
      mockPrisma.contact.create.mockResolvedValue({ id: 'contact-1', ...dto });

      const result = await service.createContact(dto, 'org-1', 'user-1');

      expect(result.isPrimaryBilling).toBe(true);
      expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
        where: { accountId: 'account-1', organizationId: 'org-1', isPrimaryBilling: true, deletedAt: null },
        data: { isPrimaryBilling: false },
      });
    });
  });
});
