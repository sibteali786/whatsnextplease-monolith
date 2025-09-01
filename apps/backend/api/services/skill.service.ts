import { SkillCreateDto } from '@wnp/types';
import prisma from '../config/db';

export class SkillService {
  async getSkills() {
    return await prisma.skill.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        skillCategory: {
          select: {
            id: true,
            categoryName: true,
          },
        },
      },
      orderBy: [
        {
          skillCategory: {
            categoryName: 'asc',
          },
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  //   async getSkillById(id: string) {
  //     return {};
  //   }

  async createSkill(skill: SkillCreateDto) {
    return await prisma.skill.create({
      data: {
        name: skill.name,
        description: skill?.description ?? '',
        skillCategoryId: skill.skillCategoryId,
      },
    });
  }

  //   async updateSkill(skill: Skill) {
  //     return {};
  //   }

  //   async deleteSkill(id: string) {
  //     return {};
  //   }

  async assignSkillsToUser(userId: string, skillNames: string[]) {
    // Validate skills exist
    const foundSkills = await prisma.skill.findMany({
      where: {
        name: { in: skillNames },
      },
      select: { id: true, name: true },
    });

    const foundSkillNames = foundSkills.map(s => s.name);
    const missingSkills = skillNames.filter(name => !foundSkillNames.includes(name));

    if (missingSkills.length > 0) {
      throw new Error(`Invalid skill names: ${missingSkills.join(', ')}`);
    }

    // Use transaction for data consistency
    await prisma.$transaction(async tx => {
      // Delete existing user skills
      await tx.userSkill.deleteMany({
        where: { userId },
      });

      // Create new user skills if any selected
      if (foundSkills.length > 0) {
        const userSkillData = foundSkills.map(skill => ({
          userId,
          skillId: skill.id,
        }));

        await tx.userSkill.createMany({
          data: userSkillData,
        });
      }
    });

    return {
      success: true,
      skills: foundSkills,
      message: `Successfully updated skills for user`,
    };
  }
}
