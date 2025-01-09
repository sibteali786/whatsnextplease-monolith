import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/db";
import logger from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      exists: !!task,
    });
  } catch (error) {
    logger.error(error, "doesTaskExists");
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: "Failed to validate task" },
        { status: 500 },
      );
    }
  }
}
