import { transformEnumValue } from "./utils/utils";
import { faker } from "@faker-js/faker";
import prisma from "./db/db"; // Assuming you have your Prisma Client set up here
import { CreatorType, Roles, TaskPriorityEnum } from "@prisma/client";

async function main() {
  // Step 1: Delete existing data
  console.log("Deleting existing data...");

  await prisma.userSkill.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.skillCategory.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.taskCategory.deleteMany({});
  await prisma.taskPriority.deleteMany({});
  await prisma.taskStatus.deleteMany({});
  await prisma.invoice.deleteMany({}); // Add deletion for invoices

  console.log("Existing data deleted.");

  // Step 2: Seed Roles
  const rolesData = [
    { name: Roles.SUPER_USER, description: "Has rights to all modules" },
    {
      name: Roles.DISTRICT_MANAGER,
      description: "Oversees sales in specific areas",
    },
    { name: Roles.TERRITORY_MANAGER, description: "Manages a territory" },
    { name: Roles.ACCOUNT_EXECUTIVE, description: "Handles client accounts" },
    { name: Roles.TASK_AGENT, description: "Performs tasks" },
    { name: Roles.TASK_SUPERVISOR, description: "Manages Tasks" },
    { name: Roles.CLIENT, description: "Requests tasks" },
  ];

  const roles = [];

  for (const roleData of rolesData) {
    const role = await prisma.role.create({
      data: roleData,
    });
    roles.push(role);
    console.log(`Role created: ${role.name}`);
  }

  // Step 3: Seed Users
  const users = [];

  for (let i = 0; i < 10; i++) {
    const role = faker.helpers.arrayElement(roles);

    const user = await prisma.user.create({
      data: {
        designation: faker.person.jobTitle().substring(0, 100),
        firstName: faker.person.firstName().substring(0, 50),
        lastName: faker.person.lastName().substring(0, 50),
        username: faker.internet.userName().substring(0, 50),
        email: faker.internet.email().substring(0, 100),
        passwordHash: faker.internet.password().substring(0, 255),
        phone: faker.phone.number().substring(0, 20),
        address: faker.location.streetAddress().substring(0, 255),
        city: faker.location.city().substring(0, 100),
        state: faker.location.state().substring(0, 50),
        zipCode: faker.location.zipCode().substring(0, 20),
        avatarUrl: faker.image.avatar().substring(0, 255),
        role: {
          connect: { id: role.id },
        },
      },
      include: {
        role: true, // Include the role in the result
      },
    });
    users.push(user);
    console.log(`User created: ${user.email}`);
  }

  // Step 4: Seed Skill Categories
  const skillCategoriesData = [
    { categoryName: "Development" },
    { categoryName: "Product Management" },
    { categoryName: "Sales & Marketing" },
    { categoryName: "Accounting & Finance" },
    { categoryName: "Support" },
  ];

  const skillCategories = [];
  for (const categoryData of skillCategoriesData) {
    const category = await prisma.skillCategory.create({ data: categoryData });
    skillCategories.push(category);
    console.log(`Skill category created: ${category.categoryName}`);
  }

  // Step 5: Seed IT and Business-Oriented Skills (20 skills)
  const skillsData = [
    {
      name: "Web Development",
      description: "Full-stack web development",
      skillCategoryId: skillCategories[0]?.id,
    },
    {
      name: "Frontend Development",
      description: "UI/UX and frontend skills",
      skillCategoryId: skillCategories[0]?.id,
    },
    {
      name: "Backend Development",
      description: "Server-side programming",
      skillCategoryId: skillCategories[0]?.id,
    },
    {
      name: "Mobile App Development",
      description: "Native and hybrid apps",
      skillCategoryId: skillCategories[0]?.id,
    },
    {
      name: "Product Management",
      description: "Product lifecycle management",
      skillCategoryId: skillCategories[1]?.id,
    },
    {
      name: "UI/UX Design",
      description: "User experience and interface design",
      skillCategoryId: skillCategories[1]?.id,
    },
    {
      name: "Agile Methodologies",
      description: "Agile and Scrum management",
      skillCategoryId: skillCategories[1]?.id,
    },
    {
      name: "Digital Marketing",
      description: "SEO and digital campaigns",
      skillCategoryId: skillCategories[2]?.id,
    },
    {
      name: "Sales Strategy",
      description: "Strategic sales management",
      skillCategoryId: skillCategories[2]?.id,
    },
    {
      name: "Lead Generation",
      description: "B2B and B2C lead gen skills",
      skillCategoryId: skillCategories[2]?.id,
    },
    {
      name: "Social Media Marketing",
      description: "Social media engagement",
      skillCategoryId: skillCategories[2]?.id,
    },
    {
      name: "Accounting",
      description: "Bookkeeping and financial reporting",
      skillCategoryId: skillCategories[3]?.id,
    },
    {
      name: "Financial Analysis",
      description: "Investment and financial planning",
      skillCategoryId: skillCategories[3]?.id,
    },
    {
      name: "Tax Planning",
      description: "Corporate and individual tax prep",
      skillCategoryId: skillCategories[3]?.id,
    },
    {
      name: "Budget Management",
      description: "Project and organizational budgets",
      skillCategoryId: skillCategories[3]?.id,
    },
    {
      name: "Customer Support",
      description: "Handling customer inquiries",
      skillCategoryId: skillCategories[4]?.id,
    },
    {
      name: "Technical Support",
      description: "Resolving technical issues",
      skillCategoryId: skillCategories[4]?.id,
    },
    {
      name: "Troubleshooting",
      description: "Diagnosing system problems",
      skillCategoryId: skillCategories[4]?.id,
    },
    {
      name: "Project Management",
      description: "Overseeing projects from start to finish",
      skillCategoryId: skillCategories[1]?.id,
    },
    {
      name: "Business Development",
      description: "Identifying growth opportunities",
      skillCategoryId: skillCategories[2]?.id,
    },
  ];

  const skills = [];
  for (const skillData of skillsData) {
    const skill = await prisma.skill.create({
      data: {
        name: skillData.name,
        description: skillData.description,
        skillCategory: {
          connect: { id: skillData.skillCategoryId }
        }
      }
    });
    skills.push(skill);
    console.log(`Skill created: ${skill.name}`);
  }

  // Step 6: Seed UserSkills
  for (const user of users) {
    const randomSkills = faker.helpers.arrayElements(
      skills,
      faker.number.int({ min: 2, max: 5 }),
    );
    for (const skill of randomSkills) {
      await prisma.userSkill.create({
        data: {
          user: { connect: { id: user.id } },
          skill: { connect: { id: skill.id } },
        },
      });
      console.log(
        `UserSkill created for user: ${user.email}, skill: ${skill.name}`,
      );
    }
  }

  // Step 7: Seed Clients
  const clients = [];

  for (let i = 0; i < 10; i++) {
    const client = await prisma.client.create({
      data: {
        username: faker.internet.userName().substring(0, 50),
        companyName: faker.company.name().substring(0, 255), // Limit to 255 characters
        contactName: faker.person.fullName().substring(0, 100), // Limit to 100 characters
        phone: faker.phone.number().substring(0, 20), // Limit to 20 characters
        email: faker.internet.email().substring(0, 100), // Limit to 100 characters
        passwordHash: faker.internet.password(),
        website: faker.internet.url().substring(0, 255), // Limit to 255 characters
        address1: faker.location.streetAddress().substring(0, 255), // Limit to 255 characters
        address2: faker.location.secondaryAddress().substring(0, 255), // Limit to 255 characters
        city: faker.location.city().substring(0, 100), // Limit to 100 characters
        state: faker.location.state().substring(0, 50), // Limit to 50 characters
        zipCode: faker.location.zipCode().substring(0, 20), // Limit to 20 characters
        avatarUrl: faker.image.avatar().substring(0, 255),
      },
    });
    clients.push(client);
    console.log(`Client created: ${client.companyName}`);
  }
  // Step 8: Seed TaskPriorities
  const taskPrioritiesData = [
    { priorityName: TaskPriorityEnum.URGENT },
    { priorityName: TaskPriorityEnum.NORMAL },
    { priorityName: TaskPriorityEnum.LOW_PRIORITY },
  ];

  const taskPriorities = [];

  for (const priorityData of taskPrioritiesData) {
    const priority = await prisma.taskPriority.create({
      data: priorityData,
    });
    taskPriorities.push(priority);
    console.log(`Task priority created: ${priority.priorityName}`);
  }

  // Step 9: Seed TaskStatuses

  const taskStatuses = [];

  for (let i = 0; i < 4; ++i) {
    const status = await prisma.taskStatus.create({
      data: {
        statusName: faker.helpers.arrayElement([
          "OVERDUE",
          "NEW",
          "IN_PROGRESS",
          "COMPLETED",
        ]),
      },
    });
    taskStatuses.push(status);
    console.log(`Task status created: ${status.statusName}`);
  }

  // Step 10: Seed TaskCategories
  const taskCategoriesData = [
    { categoryName: "Data Entry" },
    { categoryName: "Research" },
    { categoryName: "Customer Support" },
  ];

  const taskCategories = [];

  for (const categoryData of taskCategoriesData) {
    const category = await prisma.taskCategory.create({
      data: categoryData,
    });
    taskCategories.push(category);
    console.log(`Task category created: ${category.categoryName}`);
  }

  // Step 11: Seed Tasks
  const tasks = [];
  for (let i = 0; i < 10; i++) {
    const category = faker.helpers.arrayElement(taskCategories);
    const priority = faker.helpers.arrayElement(taskPriorities);
    const status = faker.helpers.arrayElement(taskStatuses);
    const assignedTo = faker.helpers.arrayElement(users);

    // Choose whether the task is created by a user or a client
    const isClientCreator = faker.datatype.boolean();
    let createdByClientId: string | null = null;
    let createdByUserId: string | null = null;
    let creatorType: CreatorType;

    if (isClientCreator) {
      const client = faker.helpers.arrayElement(clients);
      createdByClientId = client.id;
      creatorType = CreatorType.CLIENT;
    } else {
      const allowedRoles = ["Super User", "Task Supervisor"];
      const creator = faker.helpers.arrayElement(
        users.filter(
          (user) =>
            user.role?.name &&
            allowedRoles.includes(transformEnumValue(user.role.name)),
        ),
      );
      createdByUserId = creator.id;
      creatorType = CreatorType.USER;
    }

    const task = await prisma.task.create({
      data: {
        title: faker.hacker.verb() + " " + faker.hacker.noun(),
        description: faker.hacker.phrase(),
        priorityId: priority.id,
        statusId: status.id,
        taskCategoryId: category.id,
        assignedToId: assignedTo.id,
        createdByClientId, // Explicitly set to null if not used
        createdByUserId, // Explicitly set to null if not used
        creatorType,
        dueDate: faker.date.soon(),
        timeForTask: faker.number.float({
          min: 1,
          max: 40,
          fractionDigits: 2,
        }),
        overTime: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      },
    });
    tasks.push(task);
    console.log(`Task created with title: ${task.title}`);
  }

  for (const task of tasks) {
    const randomSkills = faker.helpers.arrayElements(
      skills,
      faker.number.int({ min: 1, max: 3 }),
    );
    for (const skill of randomSkills) {
      await prisma.taskSkill.create({
        data: {
          task: { connect: { id: task.id } },
          skill: { connect: { id: skill.id } },
        },
      });
      console.log(
        `TaskSkill created for task: ${task.id}, skill: ${skill.name}`,
      );
    }
  }
  // Step 12: Seed Invoices
  for (let i = 0; i < 10; i++) {
    const client = faker.helpers.arrayElement(clients);
    const task = faker.helpers.arrayElement(tasks);

    const invoice = await prisma.invoice.create({
      data: {
        client: { connect: { id: client.id } },
        task: { connect: { id: task.id } },
        invoiceNumber: faker.finance.accountNumber(),
        date: faker.date.recent(),
        amount: faker.finance.amount({
          min: 100,
          max: 500,
          dec: 2,
        }),
        status: faker.helpers.arrayElement(["PAID", "PENDING", "OVERDUE"]),
      },
    });
    console.log(
      `Invoice created for client: ${client.companyName}, amount: ${invoice.amount}, status: ${invoice.status}`,
    );
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
