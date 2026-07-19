import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../context/request-context.service';

import { PrismaService } from '../../shared/prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions?: string[];
  orgId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly requestContextService: RequestContextService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is missing');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token credentials validation failed');
    }

    // Verify user exists and is active in the database to prevent unexpired tokens of suspended/inactive users from accessing APIs
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    this.requestContextService.setUserId(payload.sub);

    if (payload.role === 'SuperAdmin') {
      // SuperAdmins can keep the tenantId set from client headers (for workspace switching),
      // fallback to token's orgId if header was empty.
      const currentTenant = this.requestContextService.getTenantId();
      if (!currentTenant && payload.orgId) {
        this.requestContextService.setTenantId(payload.orgId);
      }
    } else {
      // Force regular users context to strictly match their validated token orgId, ignoring headers
      this.requestContextService.setTenantId(payload.orgId || '');
    }

    // Return object mapped to req.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
      organizationId: payload.orgId,
    };
  }
}

