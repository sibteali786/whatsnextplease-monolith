import prisma from '../config/db';

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, roleId, ...rest } = user;
      return rest;
    }
    return null;
  }
}
