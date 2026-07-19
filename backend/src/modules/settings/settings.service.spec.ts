import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashednewpassword'),
}));

const mockPrisma = {
  user: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  organization: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';

const mockUser = {
  id: ACTOR_ID,
  email: 'user@dgo.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '1234567890',
  timezone: 'UTC',
  passwordHash: '$2b$10$hashedcurrentpasswordhashvalue',
};

const mockOrg = {
  id: ORG_ID,
  name: 'DGO Outsourcing',
  subdomain: 'dgo',
  status: 'active',
  phone: '8005550199',
  address: '123 SaaS Street',
  defaultCurrency: 'USD',
  timezone: 'UTC',
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    it('should update user profile details and register an audit log entry', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, firstName: 'Johnny' });

      const dto = {
        firstName: 'Johnny',
        lastName: 'Doe',
      };

      const result = await service.updateProfile(ACTOR_ID, ORG_ID, dto);

      expect(result.firstName).toBe('Johnny');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ACTOR_ID },
          data: expect.objectContaining({
            firstName: 'Johnny',
          }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should compare current password using bcrypt and update with new hash', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.changePassword(ACTOR_ID, ORG_ID, {
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ACTOR_ID },
          data: { passwordHash: 'hashednewpassword' },
        }),
      );
    });

    it('should fail if current password comparison is incorrect', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(ACTOR_ID, ORG_ID, {
          currentPassword: 'IncorrectPassword',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization parameters', async () => {
      mockPrisma.organization.findUniqueOrThrow.mockResolvedValue(mockOrg);
      mockPrisma.organization.update.mockResolvedValue({ ...mockOrg, name: 'DGO New Name' });

      const dto = {
        name: 'DGO New Name',
        defaultCurrency: 'EUR',
      };

      const result = await service.updateOrganization(ORG_ID, ACTOR_ID, dto);

      expect(result.name).toBe('DGO New Name');
      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ORG_ID },
          data: expect.objectContaining({
            name: 'DGO New Name',
            defaultCurrency: 'EUR',
          }),
        }),
      );
    });
  });
});
