// app/api/skills/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/db/db';

export async function GET() {
  try {
    const categories = await prisma.skillCategory.findMany({
      select: {
        id: true,
        categoryName: true,
        skills: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        categoryName: 'asc',
      },
    });

    const response = NextResponse.json(categories);

    return response;
  } catch (error) {
    console.error('Error fetching data:', error);
    return new NextResponse('Failed to fetch skills', { status: 500 });
  }
}
