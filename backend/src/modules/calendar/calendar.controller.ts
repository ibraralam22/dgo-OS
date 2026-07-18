import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /** Next N events for the current user — dashboard widget */
  @Get('upcoming')
  @RequirePermissions('calendar:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get next 5 upcoming events for the authenticated user' })
  async getUpcoming(
    @ActiveUser() user: ActiveUserData,
    @Query('limit') limit = '5',
  ) {
    return this.calendarService.getUpcoming(
      user.organizationId!,
      user.id,
      Math.max(1, Math.min(20, parseInt(limit, 10))),
    );
  }

  /** List events in a date-range window */
  @Get('events')
  @RequirePermissions('calendar:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query calendar events within a date range' })
  async listEvents(
    @ActiveUser() user: ActiveUserData,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('myOnly') myOnly?: string,
  ) {
    if (!from || !to) {
      throw new Error('Query params "from" and "to" are required');
    }
    return this.calendarService.listEvents(user.organizationId!, user.id, {
      from,
      to,
      type,
      entityType,
      entityId,
      myOnly: myOnly === 'true',
    });
  }

  /** Get single event */
  @Get('events/:id')
  @RequirePermissions('calendar:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single calendar event by ID' })
  async getEventById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.calendarService.getEventById(id, user.organizationId!);
  }

  /** Create event */
  @Post('events')
  @RequirePermissions('calendar:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new calendar event' })
  async createEvent(@Body() dto: CreateEventDto, @ActiveUser() user: ActiveUserData) {
    return this.calendarService.createEvent(dto, user.organizationId!, user.id);
  }

  /** Update event (owner or admin) */
  @Put('events/:id')
  @RequirePermissions('calendar:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a calendar event (owner or admin only)' })
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    const isAdmin = user.roles?.some((r) => ['SuperAdmin', 'TenantAdmin'].includes(r)) ?? false;
    return this.calendarService.updateEvent(id, dto, user.organizationId!, user.id, isAdmin);
  }

  /** Delete event (owner or admin) */
  @Delete('events/:id')
  @RequirePermissions('calendar:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a calendar event (owner or admin only)' })
  async deleteEvent(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    const isAdmin = user.roles?.some((r) => ['SuperAdmin', 'TenantAdmin'].includes(r)) ?? false;
    return this.calendarService.deleteEvent(id, user.organizationId!, user.id, isAdmin);
  }

  /** Add attendees */
  @Post('events/:id/attendees')
  @RequirePermissions('calendar:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add attendees to an event' })
  async addAttendees(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @ActiveUser() user: ActiveUserData,
  ) {
    const isAdmin = user.roles?.some((r) => ['SuperAdmin', 'TenantAdmin'].includes(r)) ?? false;
    return this.calendarService.addAttendees(id, userIds, user.organizationId!, user.id, isAdmin);
  }

  /** Remove a single attendee */
  @Delete('events/:id/attendees/:userId')
  @RequirePermissions('calendar:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an attendee from an event' })
  async removeAttendee(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    const isAdmin = user.roles?.some((r) => ['SuperAdmin', 'TenantAdmin'].includes(r)) ?? false;
    return this.calendarService.removeAttendee(id, userId, user.organizationId!, user.id, isAdmin);
  }

  /** RSVP — accept or decline own invite */
  @Patch('events/:id/attendees/me/rsvp')
  @RequirePermissions('calendar:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or decline an event invitation' })
  async rsvp(
    @Param('id') id: string,
    @Body() dto: RsvpDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.calendarService.rsvp(id, dto, user.organizationId!, user.id);
  }
}
