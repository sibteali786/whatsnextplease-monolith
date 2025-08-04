'use server';

import prisma from '@/db/db';

export async function fetchAllSkills() {
  try {
    const skills = await prisma.skill.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        skillCategory: {
          select: {
            categoryName: true,
          },
        },
      },
    });
    return { skills, success: true };
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return { skills: [], success: false, error: 'Failed to fetch skills' };
  }
}

export async function fetchUserSkills(userId: string) {
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
      skills: [],
      error: 'Failed to fetch user skills',
    };
  }
}
