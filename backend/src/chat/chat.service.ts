import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GENERAL_CHANNEL_NAME = 'general';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // The general channel is created once, lazily, the first time anyone
  // needs it — rather than requiring a separate seed script
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

  // Makes sure a ConversationParticipant row exists for this pair — safe
  // to call every time a user connects, even if they're already a member
  async ensureParticipant(conversationId: number, userId: number) {
    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: { conversationId, userId },
    });
  }

  // Finds the existing direct conversation between two users, or creates
  // one (plus both participant rows) if it doesn't exist yet
  async findOrCreateDirectConversation(userIdA: number, userIdB: number) {
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

  // Every conversation a user belongs to — used on socket connection to
  // know which rooms to join automatically
  async getUserConversationIds(userId: number): Promise<number[]> {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return rows.map((r) => r.conversationId);
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
