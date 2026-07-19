import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  task: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userOrganization: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const TASK_ID = 'task-uuid';

const mockTask = {
  id: TASK_ID,
  organizationId: ORG_ID,
  title: 'Test Task',
  status: 'TODO',
  priority: 'MEDIUM',
  createdById: ACTOR_ID,
  deletedAt: null,
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── listTasks ───────────────────────────────────────────────────────────────

  describe('listTasks', () => {
    it('should return paginated tasks', async () => {
      mockPrisma.task.count.mockResolvedValue(2);
      mockPrisma.task.findMany.mockResolvedValue([mockTask, { ...mockTask, id: 'task-2' }]);

      const result = await service.listTasks(ORG_ID, { page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 0 }),
      );
    });

    it('should apply status filter', async () => {
      mockPrisma.task.count.mockResolvedValue(1);
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);

      await service.listTasks(ORG_ID, { page: 1, limit: 10, status: 'TODO' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'TODO' }),
        }),
      );
    });

    it('should set overdue filter when overdue=true', async () => {
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.listTasks(ORG_ID, { page: 1, limit: 10, overdue: true });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: expect.any(Date) },
          }),
        }),
      );
    });
  });

  // ─── getKpis ─────────────────────────────────────────────────────────────────

  describe('getKpis', () => {
    it('should return KPI count object', async () => {
      mockPrisma.task.count.mockResolvedValue(5);

      const result = await service.getKpis(ORG_ID, ACTOR_ID);

      expect(result).toMatchObject({
        total: expect.any(Number),
        overdue: expect.any(Number),
        completedToday: expect.any(Number),
        urgentHigh: expect.any(Number),
        myOpen: expect.any(Number),
      });
    });
  });

  // ─── getTaskById ─────────────────────────────────────────────────────────────

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      const result = await service.getTaskById(TASK_ID, ORG_ID);
      expect(result.id).toBe(TASK_ID);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      await expect(service.getTaskById('bad-id', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createTask ──────────────────────────────────────────────────────────────

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      mockPrisma.task.create.mockResolvedValue({ ...mockTask, title: 'New Task' });

      const result = await service.createTask({ title: 'New Task' }, ORG_ID, ACTOR_ID);

      expect(result.title).toBe('New Task');
      expect(mockPrisma.task.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when entityType given without entityId', async () => {
      await expect(
        service.createTask({ title: 'Task', entityType: 'lead' }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate assignedToId belongs to the org', async () => {
      mockPrisma.userOrganization.findFirst.mockResolvedValue(null);
      await expect(
        service.createTask({ title: 'Task', assignedToId: 'foreign-user' }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── patchStatus ─────────────────────────────────────────────────────────────

  describe('patchStatus', () => {
    it('should transition status and set completedAt when DONE', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS' });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'DONE', completedAt: new Date() });

      const result = await service.patchStatus(TASK_ID, { status: 'DONE' }, ORG_ID, ACTOR_ID);

      expect(result.status).toBe('DONE');
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DONE', completedAt: expect.any(Date) }),
        }),
      );
    });

    it('should clear completedAt when moving out of DONE', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, status: 'DONE' });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS', completedAt: null });

      await service.patchStatus(TASK_ID, { status: 'IN_PROGRESS' }, ORG_ID, ACTOR_ID);

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: null }),
        }),
      );
    });

    it('should throw ForbiddenException on blocked CANCELLED → TODO transition', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, status: 'CANCELLED' });

      await expect(
        service.patchStatus(TASK_ID, { status: 'TODO' }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── deleteTask ──────────────────────────────────────────────────────────────

  describe('deleteTask', () => {
    it('should soft-delete the task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, deletedAt: new Date() });

      const result = await service.deleteTask(TASK_ID, ORG_ID, ACTOR_ID);

      expect(result.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException when deleting missing task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      await expect(service.deleteTask('bad-id', ORG_ID, ACTOR_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
