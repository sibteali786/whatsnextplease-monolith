import prisma from './db/db';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';

async function main() {
  console.log('Starting essential data seeding...');

  // Clear all data in the correct order to handle foreign key constraints
  console.log('🗑️  Clearing all existing data...');

  try {
    // Delete in reverse dependency order to avoid foreign key constraint errors
    console.log('Deleting dependent data...');

    // Delete junction tables and dependent records first
    await prisma.pushSubscription.deleteMany({});
    await prisma.taskHistory.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.userSchedule.deleteMany({});
    await prisma.messageParticipant.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.taskFile.deleteMany({});
    await prisma.taskSkill.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.file.deleteMany({});
    await prisma.fileCategory.deleteMany({});
    await prisma.rate.deleteMany({});
    await prisma.taskOffering.deleteMany({});
    await prisma.taskCategory.deleteMany({});
    await prisma.clientBilling.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.userTerritory.deleteMany({});
    await prisma.userSkill.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.territory.deleteMany({});
    await prisma.district.deleteMany({});
    await prisma.skill.deleteMany({});
    await prisma.skillCategory.deleteMany({});
    await prisma.picklist.deleteMany({});

    // Delete core lookup tables last
    await prisma.role.deleteMany({});
    await prisma.taskPriority.deleteMany({});
    await prisma.taskStatus.deleteMany({});

    console.log('✅ All existing data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    // Continue with seeding even if clearing fails (in case DB is empty)
  }

  // Step 1: Seed Roles - these are critical for user creation
  console.log('🎭 Seeding roles...');
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
    console.log(`✓ Role created: ${roleData.name}`);
  }

  // Step 2: Seed Task Priorities - required for task creation
  console.log('⚡ Seeding task priorities...');
  const taskPrioritiesData = [

    // New priority system
    { priorityName: TaskPriorityEnum.CRITICAL },
    { priorityName: TaskPriorityEnum.HIGH },
    { priorityName: TaskPriorityEnum.MEDIUM },
    { priorityName: TaskPriorityEnum.LOW },
    { priorityName: TaskPriorityEnum.HOLD },
  ];

  for (const priorityData of taskPrioritiesData) {
    await prisma.taskPriority.create({
      data: priorityData,
    });
    console.log(`✓ Task priority created: ${priorityData.priorityName}`);
  }

  // Step 3: Seed Task Statuses - required for task creation
  console.log('📊 Seeding task statuses...');
  const taskStatusesData = [
    { statusName: TaskStatusEnum.NEW },
    { statusName: TaskStatusEnum.IN_PROGRESS },
    { statusName: TaskStatusEnum.COMPLETED },
    { statusName: TaskStatusEnum.OVERDUE },

    // New statuses
    { statusName: TaskStatusEnum.REVIEW },
    { statusName: TaskStatusEnum.CONTENT_IN_PROGRESS },
    { statusName: TaskStatusEnum.TESTING },
    { statusName: TaskStatusEnum.BLOCKED },
    { statusName: TaskStatusEnum.ON_HOLD },
    { statusName: TaskStatusEnum.APPROVED },
    { statusName: TaskStatusEnum.REJECTED },
  ];

  for (const statusData of taskStatusesData) {
    await prisma.taskStatus.create({
      data: statusData,
    });
    console.log(`✓ Task status created: ${statusData.statusName}`);
  }

  console.log('🎉 Essential data seeding completed successfully!');
  console.log(`
📋 Summary:
- ${rolesData.length} roles created
- ${taskPrioritiesData.length} task priorities created  
- ${taskStatusesData.length} task statuses created
  `);
}

main()
  .catch(e => {
    console.error('❌ Error during essential data seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
