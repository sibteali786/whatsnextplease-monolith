import { NextRequest, NextResponse } from "next/server";
import prisma from "@/db/db";
import logger from "@/utils/logger";
import { Roles } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json();

    const exists =
      role === Roles.CLIENT
        ? await prisma.client.findUnique({ where: { id: userId } })
        : await prisma.user.findUnique({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      exists: !!exists,
    });
  } catch (error) {
    logger.error(error, "doesUserExists");
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: "Failed to validate user" },
        { status: 500 },
      );
    }
  }
}
