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
    });
  }
  async createSkillCategory() {
    return {};
  }
  async updateSkillCategory() {
    return {};
  }
  async deleteSkillCategory() {
    return {};
  }
}
