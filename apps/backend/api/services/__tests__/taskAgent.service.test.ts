import { prismaMock } from '../../test/mockPrisma';
import { Roles, User } from '@prisma/client';
import { TaskAgentService } from '../taskAgent.service';

describe('TaskAgentService', () => {
  let service: TaskAgentService;

  beforeEach(() => {
    service = new TaskAgentService();
    jest.clearAllMocks();
  });

  describe('getTaskAgentIds', () => {
    it('should return task agent IDs', async () => {
      const mockUsers = [{ id: 'agent1' }, { id: 'agent2' }, { id: 'agent3' }];

      prismaMock.user.findMany.mockResolvedValue(mockUsers as unknown as User[]);

      const result = await service.getTaskAgentIds();

      expect(result).toEqual({
        ids: ['agent1', 'agent2', 'agent3'],
        totalCount: 3,
      });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          role: {
            name: Roles.TASK_AGENT,
          },
        },
        orderBy: {
          id: 'asc',
        },
        select: {
          id: true,
        },
      });
    });

    it('should handle errors', async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getTaskAgentIds()).rejects.toThrow('Failed to retrieve task agent IDs');
    });
  });

  describe('getTaskAgents', () => {
    it('should return task agents with counts', async () => {
      // Mock user count and initial user query
      const mockUsers = [{ id: 'agent1' }, { id: 'agent2' }];

      prismaMock.user.count.mockResolvedValue(2);
      prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as unknown as User[]);

      // Mock user details - this is important to set up correctly
      const mockUserDetails = [
        { id: 'agent1', firstName: 'John', lastName: 'Doe', designation: 'Developer' },
        { id: 'agent2', firstName: 'Jane', lastName: 'Smith', designation: 'Designer' },
      ];

      // This mock is for the second findMany call that fetches user details
      prismaMock.user.findMany.mockResolvedValueOnce(mockUserDetails as unknown as User[]);

      // Mock the transaction for task grouping
      prismaMock.$transaction.mockResolvedValue([
        // Assigned tasks (NEW)
        [
          { assignedToId: 'agent1', _count: { id: 5 } },
          { assignedToId: 'agent2', _count: { id: 2 } },
        ],
        // In Progress tasks
        [
          { assignedToId: 'agent1', _count: { id: 3 } },
          { assignedToId: 'agent2', _count: { id: 1 } },
        ],
        // Completed tasks
        [
          { assignedToId: 'agent1', _count: { id: 10 } },
          { assignedToId: 'agent2', _count: { id: 5 } },
        ],
        // Overdue tasks
        [
          { assignedToId: 'agent1', _count: { id: 1 } },
          // agent2 has no overdue tasks
        ],
      ]);

      const result = await service.getTaskAgents();

      expect(result).toMatchObject({
        taskAgents: [
          {
            id: 'agent1',
            firstName: 'John',
            lastName: 'Doe',
            designation: 'Developer',
            assignedTasksCount: 5,
            inProgressTasksCount: 3,
            completedTasksCount: 10,
            overdueTasksCount: 1,
          },
          {
            id: 'agent2',
            firstName: 'Jane',
            lastName: 'Smith',
            designation: 'Designer',
            assignedTasksCount: 2,
            inProgressTasksCount: 1,
            completedTasksCount: 5,
            overdueTasksCount: 0,
          },
        ],
        totalCount: 2,
      });
    });

    it('should apply pagination correctly', async () => {
      // Create an array of 11 user IDs (pageSize + 1)
      const mockUsers = Array(11)
        .fill(null)
        .map((_, i) => ({
          id: `agent${i + 1}`,
        }));

      prismaMock.user.count.mockResolvedValue(20);
      // First query gets the IDs
      prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as unknown as User[]);

      // Mock user details (10 items) for the second findMany
      const mockUserDetails = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `agent${i + 1}`,
          firstName: `First${i + 1}`,
          lastName: `Last${i + 1}`,
          designation: `Role${i + 1}`,
        }));

      prismaMock.user.findMany.mockResolvedValueOnce(mockUserDetails as unknown as User[]);

      // Mock empty transaction results (no tasks for any agent)
      prismaMock.$transaction.mockResolvedValue([[], [], [], []]);

      const result = await service.getTaskAgents(null, 10);

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('agent10');
      expect(result.taskAgents.length).toBe(10);
    });

    it('should filter by status correctly', async () => {
      // Mock user data
      const mockUsers = [{ id: 'agent1' }, { id: 'agent2' }];

      prismaMock.user.count.mockResolvedValue(2);
      prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as unknown as User[]);

      // Mock user details
      const mockUserDetails = [
        { id: 'agent1', firstName: 'John', lastName: 'Doe', designation: 'Developer' },
        { id: 'agent2', firstName: 'Jane', lastName: 'Smith', designation: 'Designer' },
      ];

      prismaMock.user.findMany.mockResolvedValueOnce(mockUserDetails as unknown as User[]);

      // Mock task counts where agent1 is working and agent2 is available
      prismaMock.$transaction.mockResolvedValue([
        // Assigned tasks (NEW)
        [
          { assignedToId: 'agent1', _count: { id: 5 } },
          // agent2 has no assigned tasks
        ],
        // In Progress tasks
        [
          { assignedToId: 'agent1', _count: { id: 3 } },
          // agent2 has no in-progress tasks
        ],
        // Completed tasks
        [
          { assignedToId: 'agent1', _count: { id: 10 } },
          { assignedToId: 'agent2', _count: { id: 5 } },
        ],
        // Overdue tasks
        [
          { assignedToId: 'agent1', _count: { id: 1 } },
          // agent2 has no overdue tasks
        ],
      ]);

      // Test 'available' filter
      const availableResult = await service.getTaskAgents(null, 10, 'available');
      expect(availableResult.taskAgents.length).toBe(1);
      expect(availableResult.taskAgents[0].id).toBe('agent2');

      // Reset mocks for next test
      jest.clearAllMocks();
      prismaMock.user.count.mockResolvedValue(2);
      prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as unknown as User[]);
      prismaMock.user.findMany.mockResolvedValueOnce(mockUserDetails as unknown as User[]);

      // Same transaction results as before
      prismaMock.$transaction.mockResolvedValue([
        // Assigned tasks (NEW)
        [
          { assignedToId: 'agent1', _count: { id: 5 } },
          // agent2 has no assigned tasks
        ],
        // In Progress tasks
        [
          { assignedToId: 'agent1', _count: { id: 3 } },
          // agent2 has no in-progress tasks
        ],
        // Completed tasks
        [
          { assignedToId: 'agent1', _count: { id: 10 } },
          { assignedToId: 'agent2', _count: { id: 5 } },
        ],
        // Overdue tasks
        [
          { assignedToId: 'agent1', _count: { id: 1 } },
          // agent2 has no overdue tasks
        ],
      ]);

      // Test 'working' filter
      const workingResult = await service.getTaskAgents(null, 10, 'working');
      expect(workingResult.taskAgents.length).toBe(1);
      expect(workingResult.taskAgents[0].id).toBe('agent1');
    });

    it('should handle empty results', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.getTaskAgents();

      expect(result.taskAgents).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('getTaskAgentById', () => {
    it('should return a task agent with counts', async () => {
      const mockUser = {
        id: 'agent1',
        firstName: 'John',
        lastName: 'Doe',
        designation: 'Developer',
      };

      prismaMock.user.findFirst.mockResolvedValue(mockUser as unknown as User);

      // Mock transaction return for counts
      prismaMock.$transaction.mockResolvedValue([5, 3, 10, 1]);

      const result = await service.getTaskAgentById('agent1');

      expect(result).toEqual({
        id: 'agent1',
        firstName: 'John',
        lastName: 'Doe',
        designation: 'Developer',
        assignedTasksCount: 5,
        inProgressTasksCount: 3,
        completedTasksCount: 10,
        overdueTasksCount: 1,
      });
    });

    it('should return null for non-existent task agent', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const result = await service.getTaskAgentById('non-existent');

      expect(result).toBeNull();
    });
  });
});
