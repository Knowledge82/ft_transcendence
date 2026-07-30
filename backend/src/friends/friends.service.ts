import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBasicInfo(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, avatarUrl: true },
    });
  }

  async sendRequest(requesterId: number, addresseeId: number) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    const addressee = await this.prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee) {
      throw new NotFoundException('User not found');
    }

    // Check both directions: maybe the other person already sent US a request
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('You are already friends with this user');
      }
      throw new ConflictException('A friend request already exists between you two');
    }

    return this.prisma.friendship.create({
      data: { requesterId, addresseeId },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async acceptRequest(userId: number, requesterId: number) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { requesterId_addresseeId: { requesterId, addresseeId: userId } },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Only the person who RECEIVED the request can accept it
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('You cannot accept this request');
    }

    return this.prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' },
    });
  }

  async removeFriendship(userId: number, otherUserId: number) {
    // Works both for rejecting a pending request and for unfriending
    // an accepted one — either way, the row is simply deleted
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({ where: { id: friendship.id } });
  }

  async listFriends(userId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true } },
        addressee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Each row has "requester" and "addressee" — we don't care which side
    // the current user is on, we just want "the other person" in each row
    return friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    );
  }

  async listPendingRequests(userId: number) {
    return this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }
}
