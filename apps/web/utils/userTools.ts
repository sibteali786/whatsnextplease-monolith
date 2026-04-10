'use server';
import prisma from '@/db/db';

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
