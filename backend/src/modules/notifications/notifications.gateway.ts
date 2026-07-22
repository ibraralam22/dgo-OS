import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

interface SocketClaims { sub: string; orgId?: string; role: string; permissions?: string[] }

@WebSocketGateway({ namespace: '/notifications', cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  afterInit(server: Server): void {
    try {
      const publisher = this.redis.client.duplicate();
      const subscriber = this.redis.client.duplicate();
      server.adapter(createAdapter(publisher, subscriber));
      this.logger.log('Notification gateway ready');
    } catch (error) {
      this.logger.error('Failed to initialize notifications Redis adapter', error as Error);
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      const organizationId = socket.handshake.auth?.organizationId as string | undefined;
      if (!token || !organizationId) throw new Error('Missing socket credentials');
      const claims = await this.jwtService.verifyAsync<SocketClaims>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const membership = await this.prisma.userOrganization.findFirst({
        where: { userId: claims.sub, organizationId, deletedAt: null },
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      });
      const permissions = membership?.role.rolePermissions.map((item) => item.permission.code) ?? [];
      if (!membership || (claims.role !== 'SuperAdmin' && !permissions.includes('notifications:read'))) {
        throw new Error('Notification access denied');
      }
      await socket.join(this.room(organizationId, claims.sub));
    } catch {
      socket.disconnect(true);
    }
  }

  emitToUser(organizationId: string, userId: string, notification: unknown): void {
    this.server.to(this.room(organizationId, userId)).emit('notification.created', notification);
  }

  private room(organizationId: string, userId: string): string {
    return `notifications:${organizationId}:${userId}`;
  }
}
