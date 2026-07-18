import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RegisterSuperAdminDto } from './dto/register-superadmin.dto';

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
  };
  organizations: {
    id: string;
    name: string;
    subdomain: string;
  }[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper to hash refresh tokens before saving to database
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validates credentials and checks user status
   */
  async validateCredentials(email: string, pass: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Account has been suspended');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Password sign-in not set up for this user',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    return user;
  }

  /**
   * Initiates session login and creates a new authenticated session
   */
  async login(
    user: { id: string },
    ipAddress?: string,
    userAgent?: string,
    requestedOrgId?: string,
  ): Promise<AuthSessionResponse> {
    return this.createSession(user.id, uuidv4(), ipAddress, userAgent, requestedOrgId);
  }

  /**
   * Generates dynamic session assets, populating JWT refresh tokens
   */
  private async createSession(
    userId: string,
    tokenFamilyId: string,
    ipAddress?: string,
    userAgent?: string,
    requestedOrgId?: string,
  ): Promise<AuthSessionResponse> {
    const userOrgs = await this.prisma.userOrganization.findMany({
      where: { userId, deletedAt: null },
      include: {
        organization: true,
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (userOrgs.length === 0) {
      throw new UnauthorizedException(
        'Account is not associated with any active organization',
      );
    }

    // Support tenant switching: find the requested organization if user belongs to it, otherwise default to first
    let activeOrgMapping = userOrgs.find(
      (uo) => uo.organizationId === requestedOrgId,
    );
    if (!activeOrgMapping) {
      activeOrgMapping = userOrgs[0];
    }

    const roleName = activeOrgMapping.role.name;
    const permissions = activeOrgMapping.role.rolePermissions.map(
      (rp) => rp.permission.code,
    );

    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userRecord) {
      throw new UnauthorizedException('User account missing');
    }

    // Generate JWT access tokens
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email: userRecord.email,
        role: roleName,
        permissions,
        orgId: activeOrgMapping.organizationId,
      },
      { expiresIn: '15m' },
    );

    // Generate unique Refresh Token
    const rawRefreshToken = uuidv4();
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    // Store the refresh token session structure in PostgreSQL database
    await this.prisma.userSession.create({
      data: {
        userId,
        tokenFamilyId,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
      },
    });

    // Populate user profile info package
    const organizations = userOrgs.map((uo) => ({
      id: uo.organization.id,
      name: uo.organization.name,
      subdomain: uo.organization.subdomain,
    }));

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: userId,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        role: roleName,
        permissions,
      },
      organizations,
    };
  }

  /**
   * Rotates active refresh tokens, enforcing security reuse detection checks
   */
  async rotateSession(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    requestedOrgId?: string,
  ): Promise<AuthSessionResponse> {
    const hash = this.hashToken(refreshToken);

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });

    // Reuse detection: If session token does not exist but refresh token is valid in payload history,
    // it could indicate a token compromise. For safety, we would locate the family scope.
    // However, if we locate a session marked as revoked, we terminate all active tokens in the family!
    if (!session) {
      throw new UnauthorizedException('Token rotation session not found');
    }

    if (session.isRevoked || session.expiresAt < new Date()) {
      // Revoke the entire token family (compromised reuse detected)
      await this.prisma.userSession.updateMany({
        where: { tokenFamilyId: session.tokenFamilyId },
        data: { isRevoked: true },
      });

      // Log high-priority security alert to DB
      await this.prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'auth.compromise_detected',
          resourceName: 'session',
          ipAddress,
          payloadBefore: {
            sessionId: session.id,
            tokenFamilyId: session.tokenFamilyId,
          },
          payloadAfter: { action: 'revoked_family' },
        },
      });

      throw new UnauthorizedException(
        'Session compromise detected. All tokens revoked.',
      );
    }

    // Revoke the old session token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Generate new rotated session within the same family scope
    return this.createSession(
      session.userId,
      session.tokenFamilyId,
      ipAddress,
      userAgent,
      requestedOrgId,
    );
  }

  /**
   * Logs out user, invalidating token session keys
   */
  async revokeSession(refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
      where: { refreshTokenHash: hash },
      data: { isRevoked: true },
    });
  }

  /**
   * Registers a new SuperAdmin user given a correct secret key.
   */
  async registerSuperAdmin(dto: RegisterSuperAdminDto) {
    const configSecret = this.configService.get<string>('SUPERADMIN_REGISTRATION_SECRET');
    if (!configSecret) {
      throw new BadRequestException('SUPERADMIN_REGISTRATION_SECRET is not configured on the server');
    }

    if (dto.secretKey !== configSecret) {
      throw new UnauthorizedException('Invalid registration secret key');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Find the SuperAdmin role
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'SuperAdmin' },
    });
    if (!superAdminRole) {
      throw new BadRequestException('SuperAdmin role not found. Please run database seeding first.');
    }

    // Find the default organization (first active org)
    let defaultOrg = await this.prisma.organization.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!defaultOrg) {
      throw new BadRequestException('No organizations found. Please run database seeding first.');
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create the User and UserOrganization entry in a transaction
    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'active',
        },
      });

      await tx.userOrganization.create({
        data: {
          userId: newUser.id,
          organizationId: defaultOrg.id,
          roleId: superAdminRole.id,
        },
      });

      return {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationName: defaultOrg.name,
      };
    });
  }
}
