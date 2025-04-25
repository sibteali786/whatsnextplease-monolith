/* eslint-disable @typescript-eslint/no-unused-vars */
import { UpdateClientProfileDto } from '@wnp/types';
import prisma from '../config/db';

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
}
