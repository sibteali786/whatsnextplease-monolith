/* eslint-disable @typescript-eslint/no-unused-vars */
import { Prisma, Roles, User } from '@prisma/client';
import prisma from '../config/db';
import { UpdateProfileDto } from '@wnp/types';
import { logger } from '../utils/logger';
export interface UserProfile extends Omit<User, 'passwordHash'> {
  role: {
    name: string;
    id: string;
  };
}
export type RoleFilter = Roles | 'ALL_ROLES' | '';
export class UserService {
  async updateProfilePicture(userId: string, profileUrl: string) {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl: profileUrl,
      },
      select: {
        id: true,
        avatarUrl: true,
      },
    });
  }

  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
    if (user) {
      const { passwordHash, roleId, ...rest } = user;
      return rest;
    }
    return null;
  }
  // user.service.ts
  async updateProfile(updateData: Partial<UpdateProfileDto>) {
    const { id, ...changes } = updateData;

    // Only include fields that have values
    const validChanges = Object.fromEntries(
      Object.entries(changes).filter(([_, value]) => value !== undefined && value !== null)
    );

    const updatedUser = await prisma.user.update({
      where: { id },
      data: validChanges,
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    const { passwordHash, roleId, ...rest } = updatedUser;
    return rest;
  }
  async deleteUser(userId: string) {
    return await prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Get all users with their roles for permission management
   * Only accessible by SUPER_USER
   */
  async getUsersWithRoles(
    page = 1,
    limit = 10,
    searchTerm: string = '',
    roleFilter: RoleFilter = 'ALL_ROLES'
  ) {
    try {
      const skip = (page - 1) * limit;
      const searchConditions = {
        ...(searchTerm
          ? {
              OR: [
                { firstName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
                { lastName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
                { username: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {}),
        ...(roleFilter &&
          roleFilter !== 'ALL_ROLES' && {
            role: { name: roleFilter as Roles },
          }),
      };
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          where: searchConditions,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            avatarUrl: true,
            roleId: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
        prisma.user.count({ where: searchConditions }),
      ]);
      const totalPages = Math.ceil(totalCount / limit);
      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        message: 'Users retrieved successfully',
      };
    } catch (error) {
      // existing error handling
      logger.error('Error fetching users with roles:', error);
      return {
        success: false,
        message: 'Failed to retrieve users',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update user role
   * Only accessible by SUPER_USER
   * CLIENT role cannot be changed
   */
  async updateUserRole(userId: string, newRoleId: string, updatedByUserId: string) {
    try {
      // First, get the current user to check if they're a client
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!currentUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Prevent changing CLIENT role
      if (currentUser.role?.name === Roles.CLIENT) {
        return {
          success: false,
          message: 'Cannot change role for CLIENT users',
        };
      }

      // Get the new role to validate it exists and isn't CLIENT
      const newRole = await prisma.role.findUnique({
        where: { id: newRoleId },
      });

      if (!newRole) {
        return {
          success: false,
          message: 'Invalid role selected',
        };
      }

      if (newRole.name === Roles.CLIENT) {
        return {
          success: false,
          message: 'Cannot assign CLIENT role through this interface',
        };
      }

      // Update the user's role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { roleId: newRoleId },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      // Log the role change for audit purposes
      try {
        await prisma.auditLog.create({
          data: {
            action: `Role changed from ${currentUser.role?.name} to ${newRole.name} for user ${currentUser.id}${currentUser.username ? ` (${currentUser.username})` : ''}`,
            userId: updatedByUserId,
            timestamp: new Date(),
          },
        });
      } catch (auditError) {
        logger.error('Failed to create audit log entry:', auditError);
        // Optionally, you can decide whether to continue or return a warning here
      }

      return {
        success: true,
        data: updatedUser,
        message: 'User role updated successfully',
      };
    } catch (error) {
      logger.error('Error updating user role:', error);
      return {
        success: false,
        message: 'Failed to update user role',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all available roles except CLIENT
   * Used for the role dropdown
   */
  async getAvailableRoles() {
    try {
      const roles = await prisma.role.findMany({
        where: {
          name: {
            not: Roles.CLIENT,
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: roles,
        message: 'Roles retrieved successfully',
      };
    } catch (error) {
      logger.error('Error fetching available roles:', error);
      return {
        success: false,
        message: 'Failed to retrieve roles',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current logged-in user profile
   * Used for getting user info without passing userId in URL
   */
  async getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    if (user) {
      const { passwordHash, roleId, ...rest } = user;
      return rest as UserProfile;
    }
    return null;
  }

  /**
   * Search users for mentions functionality
   * Returns users matching the search query
   */
  async searchUsersForMentions(
    query: string,
    requestingUserId: string,
    roleFilter?: string,
    taskId?: string
  ): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      name: string;
      avatar: string | null;
      role: string;
      username: string;
    }>;
    message?: string;
    error?: string;
  }> {
    try {
      if (query.length === 0 || query.trim() === '') {
        return await this.getContextualUsersForMentions(requestingUserId, taskId);
      }
      if (query.length < 2) {
        return {
          success: true,
          data: [],
          message: 'Query too short',
        };
      }
      const searchConditions = {
        AND: [
          {
            OR: [
              { firstName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { lastName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { username: { contains: query, mode: Prisma.QueryMode.insensitive } },
            ],
          },
          { id: { not: requestingUserId } }, // Exclude current user
          ...(roleFilter && roleFilter !== 'ALL_ROLES'
            ? [{ role: { name: roleFilter as Roles } }]
            : []),
        ],
      };
      const users = await prisma.user.findMany({
        where: searchConditions,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          role: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });

      const formattedUsers = users.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        avatar: user.avatarUrl,
        role: user.role?.name || 'Unknown',
        username: user.username,
      }));

      return {
        success: true,
        data: formattedUsers,
        message: 'Users retrieved successfully',
      };
    } catch (error) {
      logger.error('Error searching users for mentions:', error);
      return {
        success: false,
        message: 'Failed to search users',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get contextual users for empty @ mentions
   * Priority: Task assignee → Skill-matched users → Recent collaborators → All users
   */

  private async getContextualUsersForMentions(
    requestingUserId: string,
    taskId?: string
  ): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      name: string;
      avatar: string | null;
      role: string;
      username: string;
    }>;
    message?: string;
  }> {
    try {
      const contextualUsers = new Set<string>();
      const userResults: Array<{
        id: string;
        name: string;
        avatar: string | null;
        role: string;
        username: string;
        priority: number;
      }> = [];
      // 1. Task assignee (highest priority)
      if (taskId) {
        const taskWithAssignee = await prisma.task.findUnique({
          where: { id: taskId },
          select: {
            assignedToId: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatarUrl: true,
                role: { select: { name: true } },
              },
            },
          },
        });
        if (taskWithAssignee?.assignedTo && taskWithAssignee.assignedToId !== requestingUserId) {
          const assignee = taskWithAssignee.assignedTo;
          contextualUsers.add(assignee.id);
          userResults.push({
            id: assignee.id,
            name:
              `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.username,
            avatar: assignee.avatarUrl,
            role: assignee.role?.name || 'Unknown',
            username: assignee.username,
            priority: 1, // Highest priority
          });
        }
      }
      // 2. Users with matching skills (second priority)
      if (taskId) {
        const taskSkills = await prisma.taskSkill.findMany({
          where: { taskId },
          select: { skillId: true },
        });

        const skillIds = taskSkills.map(ts => ts.skillId);

        if (skillIds.length > 0) {
          const skillMatchedUsers = await prisma.user.findMany({
            where: {
              AND: [
                { id: { not: requestingUserId } },
                { id: { notIn: Array.from(contextualUsers) } },
                // Users who have any of the task's required skills
                {
                  userSkills: {
                    some: {
                      skillId: { in: skillIds },
                    },
                  },
                },
                // Exclude CLIENT role users
                { role: { name: { not: Roles.CLIENT } } },
              ],
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              avatarUrl: true,
              role: { select: { name: true } },
              userSkills: {
                where: { skillId: { in: skillIds } },
                select: { skillId: true },
              },
            },
            take: 4, // Limit to prevent too many results
          });

          // Sort by number of matching skills (more matches = higher in results)
          const sortedBySkillMatch = skillMatchedUsers
            .map(user => ({
              ...user,
              matchingSkillsCount: user.userSkills.length,
            }))
            .sort((a, b) => b.matchingSkillsCount - a.matchingSkillsCount);

          sortedBySkillMatch.forEach(user => {
            if (!contextualUsers.has(user.id)) {
              contextualUsers.add(user.id);
              userResults.push({
                id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                avatar: user.avatarUrl,
                role: user.role?.name || 'Unknown',
                username: user.username,
                priority: 2, // Second priority
              });
            }
          });
        }
      }
      // 3. Recent collaborators (third priority)
      const recentCollaborators = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: requestingUserId } },
            { id: { notIn: Array.from(contextualUsers) } },
            { role: { name: { not: Roles.CLIENT } } },
            {
              OR: [
                // Users who commented on tasks where requesting user also commented (last 30 days)
                {
                  taskCommentsAuthored: {
                    some: {
                      task: {
                        taskComments: {
                          some: {
                            authorUserId: requestingUserId,
                            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                          },
                        },
                      },
                      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    },
                  },
                },
                // Users assigned to tasks created by requesting user
                { tasksAssigned: { some: { createdByUserId: requestingUserId } } },
                // Users who created tasks assigned to requesting user
                { tasksCreated: { some: { assignedToId: requestingUserId } } },
              ],
            },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          role: { select: { name: true } },
        },
        take: 3,
        orderBy: [{ taskCommentsAuthored: { _count: 'desc' } }, { firstName: 'asc' }],
      });

      recentCollaborators.forEach(user => {
        if (!contextualUsers.has(user.id)) {
          contextualUsers.add(user.id);
          userResults.push({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
            avatar: user.avatarUrl,
            role: user.role?.name || 'Unknown',
            username: user.username,
            priority: 3, // Third priority
          });
        }
      });

      // 4. Other users (lowest priority) - fill remaining slots up to 8 total
      const remainingSlots = Math.max(0, 8 - userResults.length);
      if (remainingSlots > 0) {
        const otherUsers = await prisma.user.findMany({
          where: {
            AND: [
              { id: { not: requestingUserId } },
              { id: { notIn: Array.from(contextualUsers) } },
              // Exclude CLIENT role users
              { role: { name: { not: Roles.CLIENT } } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            role: { select: { name: true } },
          },
          take: remainingSlots,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        });

        otherUsers.forEach(user => {
          userResults.push({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
            avatar: user.avatarUrl,
            role: user.role?.name || 'Unknown',
            username: user.username,
            priority: 4, // Lowest priority
          });
        });
      }

      // Sort by priority, then by name
      const sortedResults = userResults
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.name.localeCompare(b.name);
        })
        .map(({ priority, ...user }) => user);

      return {
        success: true,
        data: sortedResults,
        message: 'Contextual users retrieved successfully',
      };
    } catch (error) {
      logger.error('Error getting contextual users for mentions:', error);
      return {
        success: false,
        message: 'Failed to get contextual users',
      };
    }
  }
  async countUsersByRole(roleName: Roles): Promise<number> {
    return await prisma.user.count({
      where: {
        role: {
          name: roleName,
        },
      },
    });
  }
}
