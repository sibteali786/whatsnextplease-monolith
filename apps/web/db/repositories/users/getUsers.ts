'use server';
import prisma from '@/db/db';
import { Prisma } from '@prisma/client';

interface GetUsersListParams {
  cursor: string | null; // Cursor to start fetching the next set of records
  pageSize?: number; // Number of records to fetch
  search?: string; // Search term for filtering users by name or email
}

const getUsers = async ({ cursor, pageSize = 10, search = '' }: GetUsersListParams) => {
  try {
    // Build search filter
    const searchFilter = search?.trim()
      ? {
          OR: [
            { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { designation: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { state: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};
    // Fetch total count of users
    const totalCount = await prisma.user.count({
      where: searchFilter,
    });

    // Use `cursor` to determine where to start fetching records
    const users = await prisma.user.findMany({
      take: pageSize + 1, // Fetch one extra record to determine if there are more pages
      ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip the cursor item itself
      where: searchFilter,
      select: {
        id: true,
        designation: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        email: true,
      },
      orderBy: {
        id: 'asc', // Sort by `id` or any other field you prefer (e.g., createdAt)
      },
    });

    // Determine if there are more records after the current page
    const hasNextPage = users.length > pageSize;

    // Remove the extra record if it exists
    if (hasNextPage) {
      users.pop();
    }

    // The cursor for the next page will be the id of the last user in the current set
    const nextCursor = hasNextPage ? users[users.length - 1]?.id : undefined;
    const modUser = users.map(user => ({
      ...user,
      role: user.designation,
    }));
    return {
      users: modUser,
      nextCursor,
      hasNextPage,
      totalCount, // Include the total count of users
    };
  } catch (error) {
    console.error('Error in getUsersList:', error);
    throw new Error('Failed to retrieve users list.');
  }
};

export default getUsers;
