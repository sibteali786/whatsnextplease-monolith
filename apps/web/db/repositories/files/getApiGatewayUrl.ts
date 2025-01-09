"use server";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { config } from "dotenv";

config();

export const getApiGatewayUrl = async (
  secretName: string = process.env.API_GATEWAY_SECRET_NAME ?? "",
) => {
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION ?? "us-east-1",
  });
  let response;
  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
      }),
    );
  } catch (error) {
    // For a list of exceptions thrown, see
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    console.error("Unable to get api url", error);
  }
  if (!response) return;
  const secret = response.SecretString ? JSON.parse(response.SecretString) : {};
  return secret.apiGateUrl ?? "";
};
