"use server";
import prisma from "@/db/db";

// Define the type for Skill and SkillCategory based on your Prisma schema
interface Skill {
  id: string;
  name: string;
}

interface SkillCategory {
  id: string;
  categoryName: string;
  skills: Skill[];
}

export async function getCategoriesWithSkills(searchParam: string = "") {
  const categories = await prisma.skillCategory.findMany({
    where: searchParam
      ? { categoryName: { contains: searchParam, mode: "insensitive" } }
      : undefined,
    include: {
      skills: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return formatCategories(categories);
}

// Specify the type for the categories parameter
function formatCategories(categories: SkillCategory[]) {
  return categories.map((category) => {
    const skillNames = category.skills.map((skill) => skill.name);
    const displayedSkills = skillNames.slice(0, 3).join(", ");
    const remainingSkillCount = skillNames.length - 3;

    const skillsDescription =
      remainingSkillCount > 0
        ? `${displayedSkills}, and +${remainingSkillCount} more.`
        : displayedSkills;

    return {
      id: category.id,
      categoryName: category.categoryName,
      skillsDescription, // "Includes: Skill1, Skill2, and X more."
    };
  });
}
