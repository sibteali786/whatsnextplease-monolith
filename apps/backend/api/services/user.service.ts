/* eslint-disable @typescript-eslint/no-unused-vars */
import { User } from '@prisma/client';
import prisma from '../config/db';
import { UpdateProfileDto } from '@wnp/types';
export interface UserProfile extends Omit<User, 'passwordHash'> {
  role: {
    name: string;
    id: string;
  };
}
export class UserService {
  async updateProfilePicture(userId: string, profileUrl: string) {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl: profileUrl,
      },
      select: {
        id: true,
        avatarUrl: true,
      },
    });
  }

  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
    if (user) {
      const { passwordHash, roleId, ...rest } = user;
      return rest;
    }
    return null;
  }
  // user.service.ts
  async updateProfile(updateData: Partial<UpdateProfileDto>) {
    const { id, ...changes } = updateData;

    // Only include fields that have values
    const validChanges = Object.fromEntries(
      Object.entries(changes).filter(([_, value]) => value !== undefined && value !== null)
    );

    const updatedUser = await prisma.user.update({
      where: { id },
      data: validChanges,
      include: {
        role: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    const { passwordHash, roleId, ...rest } = updatedUser;
    return rest;
  }
}
