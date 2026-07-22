import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

const prisma = {
  userOrganization: { findMany: jest.fn() },
  notification: { upsert: jest.fn(), findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  task: { findMany: jest.fn() },
  calendarEvent: { findMany: jest.fn() },
};
const gateway = { emitToUser: jest.fn() };

describe('NotificationsService', () => {
  let service: NotificationsService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [NotificationsService, { provide: PrismaService, useValue: prisma }, { provide: NotificationsGateway, useValue: gateway }] }).compile();
    service = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('creates only permitted related-recipient notifications and emits them', async () => {
    prisma.userOrganization.findMany.mockResolvedValue([{ userId: 'recipient', role: { name: 'SalesRepresentative', rolePermissions: [{ permission: { code: 'tasks:read' } }] } }]);
    prisma.notification.upsert.mockResolvedValue({ id: 'notification', recipientId: 'recipient' });
    await service.createActivity({ organizationId: 'org', actorId: 'actor', recipientIds: ['actor', 'recipient'], resourceType: 'task', resourceId: 'task', title: 'Assigned', body: 'Follow up', dedupeKey: 'task:task:assigned' });
    expect(prisma.notification.upsert).toHaveBeenCalledTimes(1);
    expect(gateway.emitToUser).toHaveBeenCalledWith('org', 'recipient', expect.any(Object));
  });

  it('scopes unread counts to the active tenant and recipient', async () => {
    prisma.notification.count.mockResolvedValue(3);
    await expect(service.unreadCount('org', 'user')).resolves.toEqual({ count: 3 });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { organizationId: 'org', recipientId: 'user', readAt: null } });
  });
});
