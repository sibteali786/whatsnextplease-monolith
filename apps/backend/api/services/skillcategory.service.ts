import { SkillCategory, SkillCategoryCreateDto, SkillCategoryEditDto } from '@wnp/types';
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
  async editSkillCategory(skillCategory: SkillCategoryEditDto) {
    const trimmedName = skillCategory.categoryName.trim();
    const existingCategory = await prisma.skillCategory.findUnique({
      where: {
        id: skillCategory.id,
      },
    });

    if (!existingCategory) {
      return {
        success: false,
        message: 'Skill category not found',
      };
    }
    // Check for duplicate category name (excluding current category)
    const duplicateCategory = await prisma.skillCategory.findFirst({
      where: {
        categoryName: trimmedName,
        NOT: {
          id: skillCategory.id,
        },
      },
    });

    if (duplicateCategory) {
      return {
        success: false,
        message: 'A skill category with this name already exists',
      };
    }
    await prisma.skillCategory.update({
      where: {
        id: skillCategory.id,
      },
      data: {
        categoryName: trimmedName,
      },
    });

    return {
      success: true,
      message: 'Skill category updated successfully',
    };
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
