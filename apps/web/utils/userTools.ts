'use server';
import { getDateFilter } from '@/utils/dateFilter';
import prisma from '@/db/db';
import { DurationEnum } from '@/types';
import { Roles } from '@prisma/client';
import { canViewTasks, getTaskFilterCondition } from './commonUtils/taskPermissions';

export const getUserIds = async () => {
  try {
    // Fetch all client IDs with consistent ordering
    const userIds = await prisma.user.findMany({
      select: {
        id: true,
      },
      orderBy: {
        id: 'asc', // Ensure the same ordering as `getClientsList`
      },
    });
    return userIds.map(user => user.id); // Return only the list of IDs
  } catch (error) {
    console.error('Error in getUserIds:', error);
    throw new Error('Failed to retrieve user IDs.');
  }
};

interface UserById {
  user: UserDetailsCardProps | null;
  message?: string;
}

export interface UserDetailsCardProps {
  firstName: string;
  lastName: string;
  username: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  address: string | null;
  avatarUrl: string | null;
}

export const getUserById = async (userId: string): Promise<UserById> => {
  if (!userId) {
    return { user: null, message: 'Invalid user id' };
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        designation: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        zipCode: true,
        address: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return { user: null, message: 'User not found' };
    }

    return { user, message: 'Successfully retrieved user' };
  } catch (e) {
    console.log(e);
    throw new Error('Failed to retrieve user');
  }
};
export interface GetTaskIdsByUserIdResponse {
  message: string;
  taskIds: string[] | null;
  success: boolean;
}
// Import the utility function

export const getTaskIdsByUserId = async (
  type: 'all' | 'assigned' | 'unassigned' | 'my-tasks',

  userId: string,
  searchTerm: string,
  duration: DurationEnum = DurationEnum.ALL,
  role: Roles
): Promise<GetTaskIdsByUserIdResponse> => {
  try {
    // Check if the role has permission to view tasks
    if (!canViewTasks(role)) {
      return {
        success: false,
        taskIds: [],
        message: `Role ${role} is not authorized to view tasks.`,
      };
    }

    // Get the appropriate filter condition based on role
    const whereCondition = getTaskFilterCondition(userId, role);
    const dateFilter = getDateFilter(duration);
    const assignedToId =
      type === 'assigned' ? { not: null } : type === 'unassigned' ? null : undefined;

    const searchFilter = searchTerm
      ? {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const AND: any[] = [];

    // A. Client visibility
    if (whereCondition?.OR) {
      AND.push({ OR: whereCondition.OR });
    }

    // B. Date filter
    if (Object.keys(dateFilter).length > 0) {
      AND.push(dateFilter);
    }

    // C. Assigned filter
    if (assignedToId !== undefined) {
      AND.push({ assignedToId });
    }

    // D. Search
    if (searchFilter?.OR) {
      AND.push({ OR: searchFilter.OR });
    }

    const where = { AND };

    const taskIds = await prisma.task.findMany({
      where,
      orderBy: { id: 'asc' },
      select: {
        id: true,
      },
    });

    return {
      taskIds: taskIds.map(task => task.id),
      message: 'Successfully retrieved task IDs for the user.',
      success: true,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to retrieve tasks by user ID');
  }
};

// app/actions/getUserSkills.ts

export async function getUserSkills(userId: string) {
  try {
    // Fetch skills possessed by the user
    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId,
      },
      include: {
        skill: {
          include: {
            skillCategory: true,
          },
        },
      },
    });

    // Transform the data into a simpler structure
    const skills = userSkills.map(userSkill => ({
      id: userSkill.skill.id,
      name: userSkill.skill.name,
      description: userSkill.skill.description,
      categoryName: userSkill.skill.skillCategory.categoryName,
    }));

    return {
      success: true,
      skills,
    };
  } catch (error) {
    console.error('Error fetching user skills:', error);
    return {
      success: false,
      error: 'Failed to fetch user skills',
    };
  }
}

// src/utils/userTools.ts

export const getFileIdsByUserId = async (userId: string) => {
  try {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return {
        message: 'Invalid user ID provided.',
        fileIds: null,
      };
    }
    const files = await prisma.file.findMany({
      where: { ownerUserId: userId },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return {
      fileIds: files.map(file => file.id),
      message: 'successfully retrieved ids ',
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to retrieve file ids by given user id');
  }
};
