import { SkillCreateDto } from '@wnp/types';
import prisma from '../config/db';

export class SkillService {
  async getSkills() {
    return await prisma.skill.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
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
}
