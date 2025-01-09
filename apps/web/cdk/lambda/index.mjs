import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize the S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    // Parse the incoming request body for file details
    const { fileKey, fileType } = JSON.parse(event.body);
    const bucketName = process.env.BUCKET_NAME;

    // Prepare the S3 PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: fileType,
    });

    // Generate a presigned URL valid for 1 minute
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    // Return the presigned URL as the response
    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl }),
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Could not generate upload URL: ${error}`,
      }),
    };
  }
};
