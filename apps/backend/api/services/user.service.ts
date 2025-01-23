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
}
