import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Safe selection via select
  // findUnique({ where: { id: userId } }) — Prisma executes the fastest SQL query SELECT ... WHERE id = $1, using a unique index on id.
  // select: { ... } — The golden rule of security. By default, Prisma scrapes all table fields from the database, including passwordHash. If a developer accidentally returns such an object to a client, the password hash will leak to the frontend (a huge security hole!).
  // Using the select object, we firmly instructed the database: "Return me only the id, email, name, avatar, and creation date. Don't even retrieve the passwordHash field from the database." This guarantees that the password hash will never leak, even if you forget to filter the response somewhere.
  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // Never return passwordHash to the client, not even by mistake
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}
