/* eslint-disable @typescript-eslint/no-unused-vars */
import { UpdateClientProfileDto } from '@wnp/types';
import prisma from '../config/db';
import z from 'zod';
import { Roles } from '@prisma/client';

export const CreateClientSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters long.'),
  contactName: z.string().nullable().optional(),
  email: z.string().email('Invalid email format.'),
  passwordHash: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character'),
  phone: z.string().nullable().optional(),
  website: z.preprocess(
    val => (val === '' ? null : val),
    z.string().url('Invalid URL format.').nullable().optional()
  ),
  address1: z.string().nullable().optional(),
  address2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
});

export const CreateClientSchemaResponse = CreateClientSchema.merge(
  z.object({
    id: z.string().uuid(),
    role: z.object({
      name: z.nativeEnum(Roles),
    }),
  })
);
export class ClientService {
  async getClientProfile(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
    if (client) {
      const { passwordHash, roleId, ...rest } = client;
      return rest;
    }

    return null;
  }

  async updateProfilePicture(clientId: string, profileUrl: string) {
    return await prisma.client.update({
      where: { id: clientId },
      data: { avatarUrl: profileUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });
  }
  async updateProfile(updatedClientInput: Partial<UpdateClientProfileDto>) {
    const { id, ...changes } = updatedClientInput;
    const noNullFields = Object.fromEntries(
      Object.entries(changes).filter(([_, value]) => value !== null && value !== undefined)
    );
    const updatedClientOutput = await prisma.client.update({
      where: { id },
      data: noNullFields,
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
    return updatedClientOutput;
  }
  async deleteClient(clientId: string) {
    return await prisma.client.delete({
      where: { id: clientId },
    });
  }

  async createClient(clientData: z.infer<typeof CreateClientSchema>) {
    return await prisma.client.create({
      data: { ...clientData },
      select: {
        id: true,
        username: true,
        companyName: true,
        contactName: true,
        passwordHash: true,
        email: true,
        phone: true,
        website: true,
        address1: true,
        address2: true,
        city: true,
        state: true,
        zipCode: true,
        role: { select: { name: true } },
      },
    });
  }
}
