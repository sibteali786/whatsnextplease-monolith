import prisma from './db/db'; // Assuming you have your Prisma Client set up here

async function main() {
  // Step 1: Delete existing data
  console.log('Deleting existing data...');

  await prisma.userSkill.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.skillCategory.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.invoice.deleteMany({}); // Add deletion for invoices
  await prisma.client.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.taskCategory.deleteMany({});
  await prisma.taskPriority.deleteMany({});
  await prisma.taskStatus.deleteMany({});
  await prisma.notification.deleteMany({});

  console.log('Existing data deleted.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
