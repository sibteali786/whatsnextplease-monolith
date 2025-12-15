import { SkillCategory, SkillCategoryCreateDto } from '@wnp/types';
import prisma from '../config/db';

export class SkillCategoryService {
  async getAllSkillCategories() {
    return await prisma.skillCategory.findMany({
      select: {
        id: true,
        categoryName: true,
        skills: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { categoryName: 'asc' },
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

  // Add this method
  async searchSkillCategories(searchTerm: string = '') {
    const categories = await prisma.skillCategory.findMany({
      where: searchTerm
        ? { categoryName: { contains: searchTerm, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        categoryName: true,
        skills: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        categoryName: 'asc',
      },
    });

    return this.formatCategories(categories);
  }

  private formatCategories(categories: SkillCategory[]) {
    return categories.map(category => {
      const skillNames = category.skills.map(skill => skill.name);
      const displayedSkills = skillNames.slice(0, 3).join(', ');
      const remainingSkillCount = skillNames.length - 3;

      const skillsDescription =
        remainingSkillCount > 0
          ? `${displayedSkills}, and +${remainingSkillCount} more.`
          : displayedSkills;

      return {
        id: category.id,
        categoryName: category.categoryName,
        skillsDescription,
      };
    });
  }
}
