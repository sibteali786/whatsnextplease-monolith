// app/api/skills/route.ts
import { NextResponse } from "next/server";
import prisma from "@/db/db";

export async function GET() {
  try {
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
        categoryName: "asc",
      },
    });

    // Associate the cache for this response with the 'skills:list' tag
    const response = NextResponse.json(categories, {
      headers: {
        "x-next-revalidate-tag": "skills:list",
      },
    });

    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    return new NextResponse("Failed to fetch skills", { status: 500 });
  }
}
