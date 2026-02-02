import prisma from '../config/db';
import { TaskViewFilterCreateDto } from '../controller/preference.controller';
export class PreferenceService {
  /**
   * Ensures preference exists for user
   */
  private async getOrCreatePreference(userId: string) {
    let preference = await prisma.preference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await prisma.preference.create({
        data: { userId },
      });
    }

    return preference;
  }

  async createTaskViewFilter(userId: string, data: TaskViewFilterCreateDto) {
    const preference = await this.getOrCreatePreference(userId);

    return await prisma.taskViewFilter.create({
      data: {
        name: data.name,
        preferenceId: preference.id,

        taskCategoryId: data.taskCategoryId ?? null,
        /* status: data.status ?? null, */
        assignedToId: data.assignedToId ?? null,
        clientId: data.clientId ?? null,
        sortField: data.sortField ?? null,
        sortDirection: data.sortDirection ?? null,
      },
    });
  }

  async getTaskViewFilters(userId: string) {
    return await prisma.taskViewFilter.findMany({
      where: {
        preference: {
          userId,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
