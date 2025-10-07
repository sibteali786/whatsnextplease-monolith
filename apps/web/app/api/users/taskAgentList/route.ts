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
    });

    const { role, skills } = parsedParams;
    const allowedRoles: Roles[] = [Roles.TASK_SUPERVISOR, Roles.CLIENT, Roles.SUPER_USER];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized Role' }, { status: 403 });
    }
    const users = await prisma.user.findMany({
      where: {
        role: {
          name: {
            in: [Roles.TASK_AGENT, Roles.TASK_SUPERVISOR],
          },
        },
        // If no skills are provided, do not filter by userSkills
        ...(skills.length > 0 && {
          userSkills: {
            some: {
              skill: {
                name: {
                  in: skills,
                },
              },
            },
          },
        }),
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    const response = {
      success: true,
      users,
    };
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
