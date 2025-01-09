// app/actions/getSkills.ts
import prisma from "@/db/db"; // Import your Prisma client

export async function getSkills() {
  try {
    const skills = await prisma.skill.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        skillCategory: {
          select: {
            categoryName: true,
          },
        },
      },
    });
    return skills;
  } catch (error) {
    console.error("Failed to fetch skills:", error);
    throw new Error("Failed to fetch skills");
  }
}
