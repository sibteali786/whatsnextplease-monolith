"use server";

import prisma from "@/db/db"; // Adjust the import path based on your project structure
import { revalidateTag } from "next/cache";

type AddSkillParams = {
  name: string;
  description?: string;
  categoryId: string;
};

export async function addSkill({
  name,
  description,
  categoryId,
}: AddSkillParams) {
  try {
    // Validate input
    if (!name || !categoryId) {
      return {
        success: false,
        message: "Skill name and category ID are required.",
      };
    }

    const newSkill = await prisma.skill.create({
      data: {
        name,
        description,
        skillCategory: {
          connect: { id: categoryId },
        },
      },
    });
    revalidateTag("skills:list");
    return {
      success: true,
      skill: newSkill,
    };
  } catch (error) {
    console.error("Failed to add skill:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add skill",
    };
  }
}
