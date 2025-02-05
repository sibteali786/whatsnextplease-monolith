import { TaskCategoryCreateDto } from '@wnp/types';
import prisma from '../config/db';

export class TaskCategoryService {
  async getAllTaskCategories() {
    return await prisma.taskCategory.findMany({
      select: {
        id: true,
        categoryName: true,
        tasks: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: 10,
    });
  }
  async createTaskCategory(taskCategory: TaskCategoryCreateDto) {
    return await prisma.taskCategory.create({
      data: {
        categoryName: taskCategory.categoryName,
      },
    });
  }
  async updateTaskCategory() {
    return {};
  }
  async deleteTaskCategory() {
    return {};
  }
}
