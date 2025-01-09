import prisma from "./db/db"; // Assuming you have your Prisma Client set up here

async function main() {
  // Step 1: Delete existing data
  console.log("Deleting existing data...");

  await prisma.file.deleteMany({});

  console.log("Existing data deleted.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
