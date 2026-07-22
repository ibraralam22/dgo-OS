import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('notifications:read')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@ActiveUser() user: ActiveUserData, @Query() query: ListNotificationsDto) { return this.notifications.list(user.organizationId!, user.id, query); }
  @Get('unread-count') count(@ActiveUser() user: ActiveUserData) { return this.notifications.unreadCount(user.organizationId!, user.id); }
  @Patch(':id/read') read(@Param('id') id: string, @ActiveUser() user: ActiveUserData) { return this.notifications.markRead(id, user.organizationId!, user.id); }
  @Post('mark-all-read') allRead(@ActiveUser() user: ActiveUserData) { return this.notifications.markAllRead(user.organizationId!, user.id); }
}
