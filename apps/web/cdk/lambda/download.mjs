import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    const { fileKey, fileType } = JSON.parse(event.body);
    const bucketName = process.env.BUCKET_NAME;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ResponseContentType: fileType,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ downloadUrl }),
    };
  } catch (error) {
    console.error("Error generating download URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Could not generate download URL: ${error}`,
      }),
    };
  }
};
