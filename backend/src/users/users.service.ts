import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SELF_PROFILE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  gender: true,
  createdAt: true,
};

const PUBLIC_PROFILE_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  gender: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SELF_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findPublicProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_PROFILE_SELECT,
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
      select: SELF_PROFILE_SELECT,
    });
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: SELF_PROFILE_SELECT,
    });
  }

  // Resets avatarUrl back to null — the frontend's Avatar component
  // already knows to show the default image whenever avatarUrl is null,
  // so there's nothing else to configure here
  async removeAvatar(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: SELF_PROFILE_SELECT,
    });
  }
}
