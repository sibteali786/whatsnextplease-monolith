'use client';
import { Roles } from '@prisma/client';
import { handleError } from '@/utils/errorHandler';
import { getAllUsersOutputSchema } from '@/utils/validationSchemas';
import { z } from 'zod';

type GetUsersSchema = z.infer<typeof getAllUsersOutputSchema>;

export const usersList = async (
  role: Roles,
  skills?: string[],
  limit: number = 0,
  page: number = 1,
  searchQuery: string = ''
): Promise<GetUsersSchema> => {
  try {
    // Only include skills in the query if it has values
    const query =
      skills && skills.length > 0
        ? `?role=${role}&limit=${limit}&page=${page}&search=${searchQuery}&skills=${skills.join(',')}`
        : `?role=${role}&limit=${limit}&page=${page}&search=${searchQuery}`;

    const response = await fetch(`/api/users/taskAgentList${query}`);

    if (!response.ok) {
      const error = new Error('Failed to fetch users');
      return handleError(error, 'usersList') as GetUsersSchema;
    }

    const jsonData = await response.json();

    const data = getAllUsersOutputSchema.parse(jsonData);

    return data;
  } catch (error) {
    return handleError(error, 'usersList') as GetUsersSchema;
  }
};
