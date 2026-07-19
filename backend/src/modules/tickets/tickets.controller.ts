import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('summary')
  @RequirePermissions('tickets:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get summary metrics of tickets' })
  async getSummary(@ActiveUser() user: ActiveUserData) {
    return this.ticketsService.getSummary(user.organizationId!, user.role, user.email);
  }

  @Get()
  @RequirePermissions('tickets:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List and filter paginated support tickets' })
  async listTickets(
    @ActiveUser() user: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '15',
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.ticketsService.listTickets(
      user.organizationId!,
      {
        page: Math.max(1, parseInt(page, 10)),
        limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
        status,
        priority,
        category,
        assignedToId,
        search,
      },
      user.role,
      user.email,
    );
  }

  @Get(':id')
  @RequirePermissions('tickets:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get specific support ticket details with comments' })
  async getTicketById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.ticketsService.getTicketById(id, user.organizationId!, user.role, user.email);
  }

  @Post()
  @RequirePermissions('tickets:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a new support ticket' })
  async createTicket(@Body() dto: CreateTicketDto, @ActiveUser() user: ActiveUserData) {
    return this.ticketsService.createTicket(dto, user.organizationId!, user.id, user.role, user.email);
  }

  @Put(':id')
  @RequirePermissions('tickets:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update ticket stage status, priority, category or assignee' })
  async updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ticketsService.updateTicket(id, dto, user.organizationId!, user.id, user.role, user.email);
  }

  @Post(':id/comments')
  @RequirePermissions('tickets:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a comment reply to the support ticket thread' })
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ticketsService.createComment(id, dto, user.organizationId!, user.id, user.role, user.email);
  }

  @Delete(':id')
  @RequirePermissions('tickets:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/archive support ticket' })
  async deleteTicket(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.ticketsService.deleteTicket(id, user.organizationId!, user.id, user.role, user.email);
  }
}
