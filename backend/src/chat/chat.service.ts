import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GENERAL_CHANNEL_NAME = 'general';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateGeneralChannel() {
    const existing = await this.prisma.conversation.findFirst({
      where: { type: 'CHANNEL', name: GENERAL_CHANNEL_NAME },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.conversation.create({
      data: { type: 'CHANNEL', name: GENERAL_CHANNEL_NAME },
    });
  }

  async getGeneralChannelMembers() {
    const general = await this.getOrCreateGeneralChannel();
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: general.id },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return participants.map((p) => p.user);
  }

  async ensureParticipant(conversationId: number, userId: number): Promise<boolean> {
    const existing = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (existing) {
      return false;
    }
    await this.prisma.conversationParticipant.create({
      data: { conversationId, userId },
    });
    return true;
  }

  async getUserBasicInfo(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, avatarUrl: true },
    });
  }

  // Direct messages are a privilege of friendship in this community —
  // everyone can talk in the general channel regardless, but private
  // conversations are reserved for people who've actually become "hermanos"
  async findOrCreateDirectConversation(userIdA: number, userIdB: number) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });
    if (!friendship) {
      throw new ForbiddenException('Solo puedes escribir en privado a tus hermanos');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: userIdA } } },
          { participants: { some: { userId: userIdB } } },
        ],
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [{ userId: userIdA }, { userId: userIdB }],
        },
      },
    });
  }

  async getUserConversationIds(userId: number): Promise<number[]> {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return rows.map((r) => r.conversationId);
  }

  // DIRECT conversations only, with the OTHER participant's info attached,
  // and only those that already have at least one message — an empty
  // conversation (just created, nobody wrote yet) has no place in a
  // sidebar of "ongoing conversations"
  async getUserDirectConversations(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        type: 'DIRECT',
        participants: { some: { userId } },
        messages: { some: {} },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    return conversations.map((c) => {
      const otherParticipant = c.participants.find((p) => p.userId !== userId);
      return {
        id: c.id,
        otherUser: otherParticipant?.user ?? null,
      };
    });
  }

  async isParticipant(conversationId: number, userId: number): Promise<boolean> {
    const row = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return row !== null;
  }

  async saveMessage(conversationId: number, senderId: number, content: string) {
    const allowed = await this.isParticipant(conversationId, senderId);
    if (!allowed) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    return this.prisma.message.create({
      data: { conversationId, senderId, content },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async getMessageHistory(conversationId: number, userId: number, limit = 50) {
    const allowed = await this.isParticipant(conversationId, userId);
    if (!allowed) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }
}
