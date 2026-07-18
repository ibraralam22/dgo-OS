import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PatchStatusDto } from './dto/patch-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ─── KPI Summary ─────────────────────────────────────────────────────────────

  @Get('kpis')
  @RequirePermissions('tasks:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get task KPI counts (open, overdue, completed today, high-priority)' })
  async getKpis(@ActiveUser() user: ActiveUserData) {
    return this.tasksService.getKpis(user.organizationId!, user.id);
  }

  // ─── My Tasks Shortcut ────────────────────────────────────────────────────────

  @Get('my')
  @RequirePermissions('tasks:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List tasks assigned to the authenticated user' })
  async getMyTasks(
    @ActiveUser() user: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('status') status?: string,
  ) {
    return this.tasksService.listTasks(user.organizationId!, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      status,
      myId: user.id,
    });
  }

  // ─── List ─────────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('tasks:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query paginated tasks with optional filters' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async listTasks(
    @ActiveUser() user: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '15',
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('overdue') overdue?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.listTasks(user.organizationId!, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      status,
      priority,
      assignedToId,
      entityType,
      entityId,
      overdue: overdue === 'true',
      search,
    });
  }

  // ─── Get One ──────────────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions('tasks:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single task by ID' })
  async getTaskById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.tasksService.getTaskById(id, user.organizationId!);
  }

  // ─── Create ───────────────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions('tasks:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(@Body() dto: CreateTaskDto, @ActiveUser() user: ActiveUserData) {
    return this.tasksService.createTask(dto, user.organizationId!, user.id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  @Put(':id')
  @RequirePermissions('tasks:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update task fields' })
  async updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tasksService.updateTask(id, dto, user.organizationId!, user.id);
  }

  // ─── Patch Status ─────────────────────────────────────────────────────────────

  @Patch(':id/status')
  @RequirePermissions('tasks:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition task status (TODO → IN_PROGRESS → DONE / CANCELLED)' })
  async patchStatus(
    @Param('id') id: string,
    @Body() dto: PatchStatusDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tasksService.patchStatus(id, dto, user.organizationId!, user.id);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  @Delete(':id')
  @RequirePermissions('tasks:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete (archive) a task' })
  async deleteTask(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.tasksService.deleteTask(id, user.organizationId!, user.id);
  }
}
