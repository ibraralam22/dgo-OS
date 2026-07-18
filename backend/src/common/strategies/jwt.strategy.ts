import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../context/request-context.service';

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

  validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token credentials validation failed');
    }

    // Overwrite the request context storage with validated JWT credentials to prevent header spoofing
    this.requestContextService.setUserId(payload.sub);
    if (payload.orgId) {
      this.requestContextService.setTenantId(payload.orgId);
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

