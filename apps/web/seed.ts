import prisma from './db/db';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';

async function main() {
  console.log('Starting essential data seeding...');

  // Only clear the necessary tables to avoid foreign key issues
  console.log('Clearing existing role data...');
  await prisma.role.deleteMany({});

  // Step 1: Seed Roles - these are critical for user creation
  console.log('Seeding roles...');
  const rolesData = [
    { name: Roles.SUPER_USER, description: 'Has rights to all modules' },
    { name: Roles.DISTRICT_MANAGER, description: 'Oversees sales in specific areas' },
    { name: Roles.TERRITORY_MANAGER, description: 'Manages a territory' },
    { name: Roles.ACCOUNT_EXECUTIVE, description: 'Handles client accounts' },
    { name: Roles.TASK_AGENT, description: 'Performs tasks' },
    { name: Roles.TASK_SUPERVISOR, description: 'Manages Tasks' },
    { name: Roles.CLIENT, description: 'Requests tasks' },
  ];

  for (const roleData of rolesData) {
    await prisma.role.create({
      data: roleData,
    });
    console.log(`Role created: ${roleData.name}`);
  }

  // Step 2: Seed Task Priorities - required for task creation
  console.log('Seeding task priorities...');
  const taskPrioritiesData = [
    { priorityName: TaskPriorityEnum.URGENT },
    { priorityName: TaskPriorityEnum.NORMAL },
    { priorityName: TaskPriorityEnum.LOW_PRIORITY },
  ];

  for (const priorityData of taskPrioritiesData) {
    try {
      await prisma.taskPriority.create({
        data: priorityData,
      });
      console.log(`Task priority created: ${priorityData.priorityName}`);
    } catch (error) {
      console.log(
        `Task priority ${priorityData.priorityName} already exists or couldn't be created`
      );
    }
  }

  // Step 3: Seed Task Statuses - required for task creation
  console.log('Seeding task statuses...');
  const taskStatusesData = [
    { statusName: TaskStatusEnum.NEW },
    { statusName: TaskStatusEnum.IN_PROGRESS },
    { statusName: TaskStatusEnum.COMPLETED },
    { statusName: TaskStatusEnum.OVERDUE },
  ];

  for (const statusData of taskStatusesData) {
    try {
      await prisma.taskStatus.create({
        data: statusData,
      });
      console.log(`Task status created: ${statusData.statusName}`);
    } catch (error) {
      console.log(`Task status ${statusData.statusName} already exists or couldn't be created`);
    }
  }

  console.log('Essential data seeding completed.');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
