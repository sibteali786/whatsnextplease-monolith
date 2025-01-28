/* eslint-disable @typescript-eslint/no-unused-vars */
import { config } from 'dotenv';
import 'server-only';
import jwt from 'jsonwebtoken';
import prisma from '@/db/db';
import bcrypt from 'bcrypt';
import { EntityAlreadyExistsError } from '@/errors/entityAlreadyExists';
import logger from './logger';
import { redirect } from 'next/navigation';
import { Roles } from '@prisma/client';
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

// Ensure SECRET is defined
const SECRET = ensureEnvVar('SECRET');

export const createTokenForUser = (id: string, username: string, role: Roles) => {
  return jwt.sign({ id, username, role }, process.env.SECRET!, {
    expiresIn: '12h',
  });
};

export const getUserFromToken = async (token: { name: string; value: string }) => {
  //TODO: handle token expired error and maybe modify error handler to better handle errors
  try {
    const payload = jwt.verify(token.value, SECRET) as {
      id: string;
      username: string;
    };
    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
        username: payload.username,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      const client = await prisma.client.findUnique({
        where: {
          id: payload.id,
          username: payload.username,
        },
        select: {
          id: true,
          username: true,
          contactName: true,
          avatarUrl: true,
          email: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      if (!client) {
        return;
      }
      const modClient = {
        id: client.id,
        name: client.contactName ?? client.username,
        username: client.username,
        email: client.email,
        avatarUrl: client.avatarUrl,
        role: {
          id: client.role?.id,
          name: client.role?.name,
        },
      };
      return modClient;
    }
    const modUser = {
      id: user.id,
      name: user.firstName + ' ' + user.lastName,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: {
        id: user.role?.id,
        name: user.role?.name,
      },
    };
    return modUser;
  } catch (error) {
    redirect('/signin');
  }
};

export const signin = async ({ username, password }: { username: string; password: string }) => {
  try {
    // Look for a match in the User table
    const matchUser = await prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    if (matchUser) {
      // If a user is found, validate their password
      const isValid = await comparePwd(password, matchUser.passwordHash);
      if (!isValid) {
        return {
          error: {
            type: 'InvalidPassword',
            message: 'Incorrect password provided',
          },
          token: null,
        };
      }

      const token = createTokenForUser(
        matchUser.id,
        matchUser.username,
        matchUser?.role ? matchUser?.role?.name : Roles.TASK_AGENT // Use user's role from DB
      );
      const { passwordHash, ...user } = matchUser;
      return { token, user, message: 'Signed in successfully' };
    }

    // If no user found, check Client table
    const matchClient = await prisma.client.findUnique({
      where: {
        username,
      },
    });
    if (!matchClient) {
      return {
        error: {
          type: 'UserNotFound',
          message: 'No user or client found with the provided username',
        },
        token: null,
      };
    }

    // Validate client password
    const isValid = await comparePwd(password, matchClient.passwordHash);
    if (!isValid) {
      return {
        error: {
          type: 'InvalidPassword',
          message: 'Incorrect password provided',
        },
        token: null,
      };
    }

    const token = createTokenForUser(
      matchClient.id,
      matchClient.username,
      Roles.CLIENT // Directly assign CLIENT role for client sign-in
    );
    const { passwordHash, ...client } = matchClient;
    return { token, client, message: 'Signed in successfully' };
  } catch (error) {
    logger.error(error, 'SignIn Error');
    return {
      error: {
        type: 'ServerError',
        message: 'An error occurred while processing your request',
      },
      token: null,
    };
  }
};

export const signup = async ({
  email,
  password,
  username,
  firstName,
  lastName,
  companyName,
  role, // Pass "Client" for clients or a valid role for users (e.g., "SuperUser", "TaskAgent")
}: {
  email: string;
  password: string;
  username: string;
  firstName?: string; // Optional for clients
  lastName?: string; // Optional for clients
  companyName?: string; // Optional for users
  role: Roles;
}) => {
  try {
    // Validate input based on role
    if (role === Roles.CLIENT && !companyName) {
      return {
        error: {
          type: 'InvalidInput',
          message: 'Invalid input provided',
        },
        token: null,
      };
    }

    if (role !== Roles.CLIENT && (!firstName || !lastName)) {
      return {
        error: {
          type: 'InvalidInput',
          message: 'Invalid input provided',
        },
        token: null,
      };
    }

    // Combine checks for username and email
    const existingUserOrClient = await prisma.$transaction([
      prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      }),
      prisma.client.findFirst({
        where: { OR: [{ username }, { email }] },
      }),
    ]);

    if (existingUserOrClient[0] || existingUserOrClient[1]) {
      return {
        error: {
          type: 'DuplicateCredentials',
          message: 'Username or email is already in use',
        },
        token: null,
      };
    }

    // Hash the password
    const hashedPassword = await hashPW(password);

    if (role === Roles.CLIENT) {
      // Create a new client
      const client = await prisma.client.create({
        data: {
          username,
          email,
          passwordHash: hashedPassword,
          companyName: companyName ?? '',
          role: { connect: { name: Roles.CLIENT } },
        },
      });

      const token = createTokenForUser(client.id, client.username, Roles.CLIENT);
      return { client, token, message: 'Client signed up successfully' };
    }

    // Create a new user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        role: { connect: { name: role } },
      },
    });

    const token = createTokenForUser(user.id, user.username, role);
    return { user, token, message: 'User signed up successfully' };
  } catch (error) {
    console.error('Signup Error:', error);
    return {
      error: {
        type: 'ServerError',
        message: 'An error occurred while processing your request',
      },
      token: null,
    };
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
  // Check if username or email already exists
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

  // If user doesn't exist, hash the password
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
  // Check if companyName or email already exists
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

  // If client doesn't exist, hash the password
  const hashedPassword = await hashPW(password);
  return hashedPassword;
};
