import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userOrganization: {
      findMany: jest.fn(),
    },
    userSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should validate correct credentials and return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@dgo.com',
        passwordHash: 'hashed-pwd',
        status: 'active',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials('test@dgo.com', 'pwd');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException on wrong credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@dgo.com',
        passwordHash: 'hashed-pwd',
        status: 'active',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateCredentials('test@dgo.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@dgo.com',
        passwordHash: 'hashed-pwd',
        status: 'suspended',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateCredentials('test@dgo.com', 'pwd'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateCredentials('nonexistent@dgo.com', 'pwd'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should create session directly without MFA', async () => {
      const user = { id: 'user-1' };

      (prisma.userOrganization.findMany as jest.Mock).mockResolvedValue([
        {
          organization: {
            id: 'org-1',
            name: 'Org 1',
            subdomain: 'org1',
          },
          organizationId: 'org-1',
          role: {
            name: 'Admin',
            rolePermissions: [
              {
                permission: {
                  code: 'leads:read',
                },
              },
            ],
          },
        },
      ]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@dgo.com',
        firstName: 'Test',
        lastName: 'User',
      });
      (prisma.userSession.create as jest.Mock).mockResolvedValue({});
      mockJwt.sign.mockReturnValue('access-token');

      const result = await service.login(user);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('organizations');
    });
  });

  describe('revokeSession', () => {
    it('should revoke session by refresh token hash', async () => {
      (prisma.userSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.revokeSession('some-refresh-token');
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ refreshTokenHash: expect.any(String) }),
        data: { isRevoked: true },
      });
    });
  });
});
