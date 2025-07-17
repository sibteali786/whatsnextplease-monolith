'use server';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from 'dotenv';

config();

export const getApiGatewayUrl = async (
  secretName: string = process.env.API_GATEWAY_SECRET_NAME ?? ''
) => {
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  let response;
  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: 'AWSCURRENT',
      })
    );
  } catch (error) {
    console.error('Unable to get api url', error);
    throw new Error(`Failed to retrieve secret: ${secretName}`);
  }

  if (!response?.SecretString) {
    throw new Error('Secret response is empty');
  }

  const secret = JSON.parse(response.SecretString);
  return secret.apiGateUrl ?? '';
};
