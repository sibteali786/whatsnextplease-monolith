// app/actions/getSkills.ts
import prisma from "@/db/db"; // Import your Prisma client

export const getSkills = async () => {
  try {
    // Fetch skills grouped by category
    const categories = await prisma.skillCategory.findMany({
      select: {
        id: true,
        categoryName: true,
        skills: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        categoryName: "asc", // Order categories alphabetically
      },
    });

    return categories.map((category) => ({
      categoryName: category.categoryName,
      skills: category.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
      })),
    }));
  } catch (error) {
    console.error("Failed to fetch skills:", error);
    throw new Error("Failed to fetch skills");
  }
};
