import { NextRequest, NextResponse } from "next/server";
import { getApiGatewayUrl } from "@/db/repositories/files/getApiGatewayUrl";
import logger from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const { fileKey, fileType } = await request.json();

    const secretName = process.env.API_GATEWAY_SECRET_NAME;
    const apiUrl = await getApiGatewayUrl(secretName);
    if (!apiUrl) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch API Gateway URL" },
        { status: 500 },
      );
    }

    const presignedUrlResponse = await fetch(`${apiUrl}generate-download-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey: fileKey, fileType }),
    });

    if (!presignedUrlResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to generate download URL" },
        { status: 500 },
      );
    }

    const { downloadUrl } = await presignedUrlResponse.json();
    return NextResponse.json({ success: true, downloadUrl });
  } catch (error) {
    logger.error(error, "Failed to process download request");
    return NextResponse.json(
      { success: false, message: "Failed to process download request" },
      { status: 500 },
    );
  }
}
