/* eslint-disable @typescript-eslint/no-unused-vars */
import { config } from 'dotenv';
import 'server-only';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { EntityAlreadyExistsError } from '@/errors/entityAlreadyExists';
import { Roles } from '@prisma/client';
import prisma from '@/db/db';
config();

// Utility function to check for environment variable
export const ensureEnvVar = (varName: string) => {
  const value = process.env[varName];
  if (!value) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`${varName} is not defined in the environment variables`);
    }
    throw new Error(`${varName} is not defined in the environment variables`);
  }
  return value;
};
/**
 * Create legacy JWT token
 * @deprecated - Only used as fallback. New users get IDP tokens.
 */
export const createTokenForUser = (id: string, username: string, role: Roles) => {
  return jwt.sign({ id, username, role }, process.env.SECRET!, {
    expiresIn: '12h',
  });
};

/**
 * Get user/client from token via backend /auth/me (supports legacy & IDP tokens)
 */
export const getUserFromToken = async (token: { name: string; value: string }) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/me`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token.value}` },
        cache: 'no-store',
      }
    );
    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Token verification failed via /auth/me:', result?.message);
      return null;
    }

    return result.data.user ?? result.data.client ?? null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const hashPW = (password: string) => {
  return bcrypt.hash(password, 10);
};

export const comparePwd = (password: string, hashPW: string) => {
  return bcrypt.compare(password, hashPW);
};

export const checkIfUserExists = async ({
  email,
  username,
  password,
}: {
  email: string;
  username: string;
  password: string;
}) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: username }, { email: email }],
    },
  });

  if (existingUser) {
    const errorMessage =
      existingUser.username === username
        ? 'Username is already taken'
        : 'Email is already registered';
    return {
      error: { type: 'UserAlreadyExists', message: errorMessage },
      hashedPassword: null,
    };
  }

  const hashedPassword = await hashPW(password);
  return { error: null, hashedPassword };
};

export const checkIfClientExists = async ({
  email,
  companyName,
  password,
}: {
  email: string;
  companyName: string;
  password: string;
}) => {
  const existingClient = await prisma.client.findFirst({
    where: {
      OR: [{ companyName }, { email }],
    },
  });

  if (existingClient) {
    const errorMessage =
      existingClient.companyName === companyName
        ? 'Company name is already registered.'
        : 'Email is already registered.';
    throw new EntityAlreadyExistsError(errorMessage);
  }

  const hashedPassword = await hashPW(password);
  return hashedPassword;
};
