import { SkillCategoryCreateDto } from '@wnp/types';
import prisma from '../config/db';

export class SkillCategoryService {
  async getAllSkillCategories() {
    return await prisma.skillCategory.findMany({
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
      take: 10,
    });
  }
  async createSkillCategory(skillCategory: SkillCategoryCreateDto) {
    return await prisma.skillCategory.create({
      data: {
        categoryName: skillCategory.categoryName,
      },
    });
  }
  async updateSkillCategory() {
    return {};
  }
  async deleteSkillCategory() {
    return {};
  }
}
