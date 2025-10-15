import prisma from '@/db/db';
import logger from '@/utils/logger';
import { getAllUsersInputSchema, getAllUsersOutputSchema } from '@/utils/validationSchemas';
import { Roles } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const parsedParams = getAllUsersInputSchema.parse({
      role: searchParams.get('role'),
      skills: searchParams.get('skills')?.split(',') ?? [],
      limit: Number(searchParams.get('limit')) || 0,
      page: Number(searchParams.get('page')) || 1,
    });

    const { role, skills, limit, page } = parsedParams;
    const allowedRoles: Roles[] = [Roles.TASK_SUPERVISOR, Roles.CLIENT, Roles.SUPER_USER];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized Role' }, { status: 403 });
    }
    const whereClause = {
      role: {
        name: {
          in: [Roles.TASK_AGENT, Roles.TASK_SUPERVISOR],
        },
      },
      ...(skills.length > 0 && {
        userSkills: {
          some: {
            skill: {
              name: { in: skills },
            },
          },
        },
      }),
    };

    let users;
    let hasMore = false;

    if (limit === 0) {
      //  Return all users (no pagination)
      users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      //  Paginated mode
      const skip = (page - 1) * limit;
      const result = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
        skip,
        take: limit + 1, // fetch one extra record
        orderBy: { createdAt: 'desc' },
      });

      hasMore = result.length > limit;
      users = result.slice(0, limit);
    }

    const response = { success: true, users, hasMore };
    // Validate response with Zod schema
    const validatedResponse = getAllUsersOutputSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    logger.error(error, 'Error fetching users:');
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}
