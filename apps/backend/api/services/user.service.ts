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
}
