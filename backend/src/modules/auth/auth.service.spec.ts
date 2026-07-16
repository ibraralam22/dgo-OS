import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'mocked-secret'),
  generateURI: jest.fn(() => 'mocked-uri'),
  verify: jest.fn(() => Promise.resolve(true)),
}));

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
      deleteMany: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      if (key === 'ENCRYPTION_KEY' || key === 'MFA_ENCRYPTION_KEY')
        return '32-character-encryption-key-test-key-32';
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
  });

  describe('login', () => {
    it('should return mfaRequired true if MFA is enabled', async () => {
      const user = { id: 'user-1', mfaEnabled: true };
      mockJwt.sign.mockReturnValue('mfa-ticket-token');

      const result = await service.login(user);
      expect(result).toEqual({
        mfaRequired: true,
        mfaTicket: 'mfa-ticket-token',
      });
    });

    it('should create session if MFA is disabled', async () => {
      const user = { id: 'user-1', mfaEnabled: false };
      const mockSession = {
        id: 'session-1',
        tokenFamilyId: 'family-1',
        user: {
          id: 'user-1',
          email: 'test@dgo.com',
          role: 'Admin',
          userOrganizations: [],
        },
      };

      (prisma.userOrganization.findMany as jest.Mock).mockResolvedValue([
        {
          organization: {
            id: 'org-1',
            name: 'Org 1',
            subdomain: 'org1',
          },
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
        role: 'Admin',
      });
      (prisma.userSession.create as jest.Mock).mockResolvedValue(mockSession);
      mockJwt.sign.mockReturnValue('access-token');

      const result = await service.login(user);
      expect(result.mfaRequired).toBe(false);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('verifyMfa', () => {
    it('should throw UnauthorizedException if ticket is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.verifyMfa('bad-ticket', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if purpose is not mfa_verification', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'user-1',
        purpose: 'wrong_purpose',
      });

      await expect(service.verifyMfa('ticket', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateMfaSecret', () => {
    it('should generate an encrypted secret and save to DB', async () => {
      const mockUser = { id: 'user-1', email: 'test@dgo.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.generateMfaSecret('user-1');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpAuthUrl');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
});
