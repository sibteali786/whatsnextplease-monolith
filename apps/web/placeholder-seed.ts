import prisma from './db/db';
import { faker } from '@faker-js/faker';
import {
  Roles,
  CreatorType,
  InvoiceStatus,
  NotificationType,
  NotificationStatus,
  NotificationDeliveryStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Starting placeholder data seeding...');

  // Step 1: Create Skill Categories and Skills
  console.log('Seeding skill categories and skills...');
  const skillCategories = await Promise.all([
    prisma.skillCategory.create({
      data: {
        categoryName: 'Technical Skills',
        skills: {
          create: [
            { name: 'JavaScript', description: 'Frontend and backend development' },
            { name: 'Python', description: 'Data science and web development' },
            { name: 'React', description: 'Frontend framework' },
            { name: 'Node.js', description: 'Backend development' },
            { name: 'AWS', description: 'Cloud infrastructure' },
          ],
        },
      },
      include: { skills: true },
    }),
    prisma.skillCategory.create({
      data: {
        categoryName: 'Design Skills',
        skills: {
          create: [
            { name: 'UI/UX Design', description: 'User interface and experience design' },
            { name: 'Graphic Design', description: 'Visual communication design' },
            { name: 'Prototyping', description: 'Interactive prototype creation' },
          ],
        },
      },
      include: { skills: true },
    }),
    prisma.skillCategory.create({
      data: {
        categoryName: 'Business Skills',
        skills: {
          create: [
            { name: 'Project Management', description: 'Managing projects and teams' },
            { name: 'Data Analysis', description: 'Analyzing business data' },
            { name: 'Sales', description: 'Customer relationship and sales' },
          ],
        },
      },
      include: { skills: true },
    }),
  ]);

  // Step 2: Create Task Categories and Task Offerings
  console.log('Seeding task categories and offerings...');
  const taskCategories = await Promise.all([
    prisma.taskCategory.create({
      data: {
        categoryName: 'Web Development',
        taskOfferings: {
          create: [
            { description: 'Full-stack web application development' },
            { description: 'Frontend React development' },
            { description: 'Backend API development' },
          ],
        },
      },
      include: { taskOfferings: true },
    }),
    prisma.taskCategory.create({
      data: {
        categoryName: 'Design & Creative',
        taskOfferings: {
          create: [
            { description: 'UI/UX design for web applications' },
            { description: 'Brand identity and logo design' },
            { description: 'Marketing materials design' },
          ],
        },
      },
      include: { taskOfferings: true },
    }),
    prisma.taskCategory.create({
      data: {
        categoryName: 'Data & Analytics',
        taskOfferings: {
          create: [
            { description: 'Data analysis and reporting' },
            { description: 'Business intelligence dashboards' },
            { description: 'Market research and analysis' },
          ],
        },
      },
      include: { taskOfferings: true },
    }),
  ]);

  // Step 3: Create Districts and Territories
  console.log('Seeding districts and territories...');
  const districts = await Promise.all([
    prisma.district.create({
      data: {
        districtName: 'North District',
        territories: {
          create: [
            { territoryName: 'North-East Territory' },
            { territoryName: 'North-West Territory' },
          ],
        },
      },
      include: { territories: true },
    }),
    prisma.district.create({
      data: {
        districtName: 'South District',
        territories: {
          create: [
            { territoryName: 'South-East Territory' },
            { territoryName: 'South-West Territory' },
          ],
        },
      },
      include: { territories: true },
    }),
  ]);

  // Get existing roles, priorities, and statuses
  const roles = await prisma.role.findMany();
  const priorities = await prisma.taskPriority.findMany();
  const statuses = await prisma.taskStatus.findMany();

  // Step 4: Create Users
  console.log('Seeding users...');
  const hashedPassword = await bcrypt.hash('Password123!@#', 10);
  const users = [];

  for (let i = 0; i < 15; i++) {
    const user = await prisma.user.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        country: faker.location.country(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        designation: faker.person.jobTitle(),
        roleId: faker.helpers.arrayElement(roles).id,
        avatarUrl: faker.image.avatar(),
      },
    });
    users.push(user);
  }

  // Step 5: Create Clients
  console.log('Seeding clients...');
  const clientRole = roles.find(r => r.name === Roles.CLIENT);
  const clients = [];

  for (let i = 0; i < 8; i++) {
    const client = await prisma.client.create({
      data: {
        email: faker.internet.email(),
        username: faker.internet.username(),
        passwordHash: hashedPassword,
        companyName: faker.company.name(),
        contactName: faker.person.fullName(),
        phone: faker.phone.number(),
        website: faker.internet.url(),
        address1: faker.location.streetAddress(),
        address2: faker.location.secondaryAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
        roleId: clientRole?.id,
        avatarUrl: faker.image.avatar(),
      },
    });
    clients.push(client);
  }

  // Step 6: Create Client Billing
  console.log('Seeding client billing...');
  for (const client of clients) {
    await prisma.clientBilling.create({
      data: {
        clientId: client.id,
        prepaidHours: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      },
    });
  }

  // Step 7: Create User Skills (Many-to-Many)
  console.log('Seeding user skills...');
  const allSkills = skillCategories.flatMap(cat => cat.skills);
  for (const user of users) {
    const userSkills = faker.helpers.arrayElements(allSkills, { min: 1, max: 4 });
    for (const skill of userSkills) {
      await prisma.userSkill.create({
        data: {
          userId: user.id,
          skillId: skill.id,
        },
      });
    }
  }

  // Step 8: Create User Territories
  console.log('Seeding user territories...');
  const allTerritories = districts.flatMap(district => district.territories);
  for (const user of users) {
    const territory = faker.helpers.arrayElement(allTerritories);
    await prisma.userTerritory.create({
      data: {
        userId: user.id,
        territoryId: territory.id,
      },
    });
  }

  // Step 9: Create Rates
  console.log('Seeding rates...');
  const allTaskOfferings = taskCategories.flatMap(cat => cat.taskOfferings);
  for (const offering of allTaskOfferings) {
    for (const priority of priorities) {
      await prisma.rate.create({
        data: {
          taskOfferingId: offering.id,
          priorityId: priority.id,
          rateAmount: faker.number.float({ min: 50, max: 200, fractionDigits: 2 }),
        },
      });
    }
  }

  // Step 10: Create File Categories
  console.log('Seeding file categories...');
  const fileCategories = await Promise.all([
    prisma.fileCategory.create({
      data: { categoryName: 'Documents' },
    }),
    prisma.fileCategory.create({
      data: { categoryName: 'Images' },
    }),
    prisma.fileCategory.create({
      data: { categoryName: 'Presentations' },
    }),
  ]);

  // Step 11: Create Files
  console.log('Seeding files...');
  const files = [];
  for (let i = 0; i < 20; i++) {
    const isUserFile = faker.datatype.boolean();
    const file = await prisma.file.create({
      data: {
        fileName: faker.system.fileName(),
        filePath: faker.internet.url(),
        fileSize: faker.number.int({ min: 1024, max: 10485760 }).toString(),
        uploadedBy: faker.person.fullName(),
        fileCategoryId: faker.helpers.arrayElement(fileCategories).id,
        ownerUserId: isUserFile ? faker.helpers.arrayElement(users).id : null,
        ownerClientId: !isUserFile ? faker.helpers.arrayElement(clients).id : null,
      },
    });
    files.push(file);
  }

  // Step 12: Create Tasks
  console.log('Seeding tasks...');
  const tasks = [];
  for (let i = 0; i < 25; i++) {
    const isCreatedByUser = faker.datatype.boolean();
    const task = await prisma.task.create({
      data: {
        title: faker.hacker.verb() + ' ' + faker.hacker.noun(),
        description: faker.hacker.phrase(),
        priorityId: faker.helpers.arrayElement(priorities).id,
        statusId: faker.helpers.arrayElement(statuses).id,
        taskCategoryId: faker.helpers.arrayElement(taskCategories).id,
        assignedToId: faker.helpers.arrayElement(users).id,
        createdByUserId: isCreatedByUser ? faker.helpers.arrayElement(users).id : null,
        createdByClientId: !isCreatedByUser ? faker.helpers.arrayElement(clients).id : null,
        creatorType: isCreatedByUser ? CreatorType.USER : CreatorType.CLIENT,
        dueDate: faker.date.future(),
        timeForTask: faker.number.float({ min: 1, max: 40, fractionDigits: 2 }),
        overTime: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      },
    });
    tasks.push(task);
  }

  // Step 13: Create Task Skills
  console.log('Seeding task skills...');
  for (const task of tasks) {
    const taskSkills = faker.helpers.arrayElements(allSkills, { min: 1, max: 3 });
    for (const skill of taskSkills) {
      await prisma.taskSkill.create({
        data: {
          taskId: task.id,
          skillId: skill.id,
        },
      });
    }
  }

  // Step 14: Create Task Files
  console.log('Seeding task files...');
  for (const task of tasks) {
    if (faker.datatype.boolean(0.6)) {
      // 60% chance of having files
      const taskFiles = faker.helpers.arrayElements(files, { min: 1, max: 3 });
      for (const file of taskFiles) {
        await prisma.taskFile.create({
          data: {
            taskId: task.id,
            fileId: file.id,
          },
        });
      }
    }
  }

  // Step 15: Create Task History
  console.log('Seeding task history...');
  for (const task of tasks) {
    const historyCount = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < historyCount; i++) {
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          statusId: faker.helpers.arrayElement(statuses).id,
          changedById: faker.helpers.arrayElement(users).id,
          changedAt: faker.date.recent({ days: 30 }),
        },
      });
    }
  }

  // Step 16: Create Invoices
  console.log('Seeding invoices...');
  for (let i = 0; i < 15; i++) {
    await prisma.invoice.create({
      data: {
        clientId: faker.helpers.arrayElement(clients).id,
        taskId: faker.helpers.arrayElement(tasks).id,
        invoiceNumber: 'INV-' + faker.number.int({ min: 1000, max: 9999 }),
        date: faker.date.recent({ days: 60 }),
        amount: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
        status: faker.helpers.arrayElement(Object.values(InvoiceStatus)),
      },
    });
  }

  // Step 17: Create Message Threads and Messages
  console.log('Seeding messages...');
  for (let i = 0; i < 10; i++) {
    const thread = await prisma.messageThread.create({
      data: {
        subject: faker.lorem.sentence(),
      },
    });

    // Add participants
    const participants = faker.helpers.arrayElements(users, { min: 2, max: 4 });
    for (const participant of participants) {
      await prisma.messageParticipant.create({
        data: {
          threadId: thread.id,
          userId: participant.id,
        },
      });
    }

    // Add messages
    const messageCount = faker.number.int({ min: 2, max: 8 });
    for (let j = 0; j < messageCount; j++) {
      await prisma.message.create({
        data: {
          threadId: thread.id,
          senderId: faker.helpers.arrayElement(participants).id,
          content: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
          createdAt: faker.date.recent({ days: 30 }),
        },
      });
    }
  }

  // Step 18: Create User Schedules
  console.log('Seeding user schedules...');
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (const user of users) {
    const workDays = faker.helpers.arrayElements(daysOfWeek, { min: 3, max: 5 });
    for (const day of workDays) {
      await prisma.userSchedule.create({
        data: {
          userId: user.id,
          dayOfWeek: day,
          availableFrom: faker.date.anytime(),
          availableTo: faker.date.anytime(),
        },
      });
    }
  }

  // Step 19: Create Notifications
  console.log('Seeding notifications...');
  for (let i = 0; i < 30; i++) {
    const isForUser = faker.datatype.boolean();
    await prisma.notification.create({
      data: {
        type: faker.helpers.arrayElement(Object.values(NotificationType)),
        status: faker.helpers.arrayElement(Object.values(NotificationStatus)),
        message: faker.lorem.sentence(),
        data: { taskId: faker.helpers.arrayElement(tasks).id },
        userId: isForUser ? faker.helpers.arrayElement(users).id : null,
        clientId: !isForUser ? faker.helpers.arrayElement(clients).id : null,
        deliveryStatus: faker.helpers.arrayElement(Object.values(NotificationDeliveryStatus)),
        lastDeliveryAttempt: faker.date.recent({ days: 7 }),
      },
    });
  }

  // Step 20: Create Audit Logs
  console.log('Seeding audit logs...');
  for (let i = 0; i < 50; i++) {
    await prisma.auditLog.create({
      data: {
        action: faker.helpers.arrayElement([
          'CREATE_TASK',
          'UPDATE_TASK',
          'DELETE_TASK',
          'LOGIN',
          'LOGOUT',
          'CREATE_USER',
          'UPDATE_USER',
        ]),
        timestamp: faker.date.recent({ days: 30 }),
        userId: faker.helpers.arrayElement(users).id,
      },
    });
  }

  // Step 21: Create some Picklists
  console.log('Seeding picklists...');
  const picklistTypes = ['PRIORITY_COLORS', 'STATUS_COLORS', 'DEPARTMENT_TYPES'];
  for (const type of picklistTypes) {
    for (let i = 0; i < 3; i++) {
      await prisma.picklist.create({
        data: {
          picklistName: type,
          value: faker.color.human(),
        },
      });
    }
  }

  console.log('✅ Placeholder data seeding completed successfully!');
  console.log(`
📊 Summary:
- ${skillCategories.length} skill categories with ${allSkills.length} skills
- ${taskCategories.length} task categories with ${allTaskOfferings.length} task offerings
- ${districts.length} districts with ${allTerritories.length} territories
- ${users.length} users
- ${clients.length} clients
- ${tasks.length} tasks
- ${files.length} files
- 10 message threads
- 30 notifications
- 50 audit logs
  `);
}

main()
  .catch(e => {
    console.error('❌ Error during placeholder seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
