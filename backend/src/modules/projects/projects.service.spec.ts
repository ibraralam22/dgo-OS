import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  projectOnboarding: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  onboardingMilestone: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userOrganization: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProjects', () => {
    it('should query and return projects', async () => {
      mockPrisma.projectOnboarding.count.mockResolvedValue(1);
      mockPrisma.projectOnboarding.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'Acme Onboarding' },
      ]);

      const result = await service.listProjects('org-1', { page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.projectOnboarding.findMany).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should return a project onboarding', async () => {
      mockPrisma.projectOnboarding.findFirst.mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        name: 'Acme Onboarding',
      });

      const result = await service.getProjectById('proj-1', 'org-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('proj-1');
    });

    it('should throw NotFoundException if project is missing', async () => {
      mockPrisma.projectOnboarding.findFirst.mockResolvedValue(null);

      await expect(service.getProjectById('missing', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProject', () => {
    it('should update and set completedAt when status changes to COMPLETED', async () => {
      mockPrisma.projectOnboarding.findFirst.mockResolvedValue({
        id: 'proj-1',
        status: 'IN_PROGRESS',
      });
      mockPrisma.projectOnboarding.update.mockResolvedValue({
        id: 'proj-1',
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const result = await service.updateProject(
        'proj-1',
        { status: 'COMPLETED' },
        'org-1',
        'user-1',
      );

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.projectOnboarding.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should clear completedAt if status changes from COMPLETED back to IN_PROGRESS', async () => {
      mockPrisma.projectOnboarding.findFirst.mockResolvedValue({
        id: 'proj-1',
        status: 'COMPLETED',
      });
      mockPrisma.projectOnboarding.update.mockResolvedValue({
        id: 'proj-1',
        status: 'IN_PROGRESS',
        completedAt: null,
      });

      const result = await service.updateProject(
        'proj-1',
        { status: 'IN_PROGRESS' },
        'org-1',
        'user-1',
      );

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.projectOnboarding.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          completedAt: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if assignedManagerId does not belong to organization', async () => {
      mockPrisma.projectOnboarding.findFirst.mockResolvedValue({
        id: 'proj-1',
        status: 'IN_PROGRESS',
      });
      mockPrisma.userOrganization.findFirst.mockResolvedValue(null); // Manager not in org

      await expect(
        service.updateProject(
          'proj-1',
          { assignedManagerId: 'some-manager' },
          'org-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addMilestone', () => {
    it('should create milestone checklist task successfully', async () => {
      mockPrisma.projectOnboarding.findFirst.mockResolvedValue({ id: 'proj-1' });
      mockPrisma.onboardingMilestone.create.mockResolvedValue({
        id: 'milestone-1',
        title: 'Kickoff Meeting',
      });

      const result = await service.addMilestone(
        'proj-1',
        { title: 'Kickoff Meeting' },
        'org-1',
        'user-1',
      );

      expect(result.title).toBe('Kickoff Meeting');
      expect(mockPrisma.onboardingMilestone.create).toHaveBeenCalled();
    });
  });

  describe('updateMilestone', () => {
    it('should set completedAt on milestone transition to true', async () => {
      mockPrisma.onboardingMilestone.findFirst.mockResolvedValue({
        id: 'milestone-1',
        completed: false,
      });
      mockPrisma.onboardingMilestone.update.mockResolvedValue({
        id: 'milestone-1',
        completed: true,
        completedAt: new Date(),
      });

      const result = await service.updateMilestone(
        'proj-1',
        'milestone-1',
        { completed: true },
        'org-1',
        'user-1',
      );

      expect(result.completed).toBe(true);
      expect(mockPrisma.onboardingMilestone.update).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        data: expect.objectContaining({
          completed: true,
          completedAt: expect.any(Date),
        }),
      });
    });
  });
});
