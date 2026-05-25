import { TaskCategoryCreateDto } from '@wnp/types';
import prisma from '../config/db';
import { TaskSerialNumberService } from './taskSerialNumber.service';
const serialNumberService = new TaskSerialNumberService();

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
    //Create category first
    const createdCategory = await prisma.taskCategory.create({
      data: {
        categoryName: taskCategory.categoryName,
      },
    });

    //Generate prefix using created category id
    const suggestion = await serialNumberService.suggestPrefixForCategory(createdCategory.id);

    //Update same category with generated prefix
    const updatedCategory = await prisma.taskCategory.update({
      where: {
        id: createdCategory.id,
      },
      data: {
        prefix: suggestion.prefix,
      },
    });

    return updatedCategory;
  }
  async updateTaskCategory() {
    return {};
  }
  async deleteTaskCategory() {
    return {};
  }
}
