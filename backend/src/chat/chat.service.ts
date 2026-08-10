import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { unlink } from 'fs/promises';
import { join } from 'path';

const GENERAL_CHANNEL_NAME = 'general';
const DELETED_MESSAGE_SELECT = {
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  deletedBy: { select: { id: true, displayName: true, role: true } },
};

// Converts the filename stored on disk into the URL the frontend actually
// fetches from — kept as a small pure helper so both saveMessage and
// getMessageHistory build it the exact same way
function toAttachmentUrl(filename: string | null): string | null {
  return filename ? `/api/chat/attachments/${filename}` : null;
}

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

  async saveMessage(
    conversationId: number,
    senderId: number,
    content: string,
    attachment?: { filename: string; type: string; name: string },
  ) {
    const allowed = await this.isParticipant(conversationId, senderId);
    if (!allowed) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Attachments are a privilege of private conversations, same spirit
    // as DMs themselves being reserved for friends — keeps the shared
    // public channel free of clutter and easier to moderate
    if (attachment) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { type: true },
      });
      if (conversation?.type !== 'DIRECT') {
        throw new ForbiddenException(
          'Los archivos adjuntos solo están permitidos en conversaciones privadas',
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        attachmentFilename: attachment?.filename,
        attachmentType: attachment?.type,
        attachmentName: attachment?.name,
      },
      include: DELETED_MESSAGE_SELECT,
    });

    return { ...message, attachmentUrl: toAttachmentUrl(message.attachmentFilename) };
  }

  async getMessageHistory(conversationId: number, userId: number, limit = 50) {
    const allowed = await this.isParticipant(conversationId, userId);
    if (!allowed) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: DELETED_MESSAGE_SELECT,
    });

    return messages.map((m) => ({ ...m, attachmentUrl: toAttachmentUrl(m.attachmentFilename) }));
  }

  async getMessageById(messageId: number) {
    return this.prisma.message.findUnique({ where: { id: messageId } });
  }

  // Used by the authenticated attachment-serving endpoint to figure out
  // which conversation a given file belongs to, so we can check whether
  // the requester is actually allowed to see it
  async findMessageByAttachment(filename: string) {
    return this.prisma.message.findFirst({ where: { attachmentFilename: filename } });
  }

  // SOFT delete: the row stays in the database forever — only its
  // content is cleared and a tombstone (who deleted it, and when) is
  // recorded. This is what lets the frontend show "Herejía eliminada
  // por <rango> <nombre>" in place of the original message, for everyone,
  // permanently — not just remove it from view for people currently online.
  async deleteMessage(messageId: number, deletedById: number) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // The physical file is still removed from disk — the tombstone only
    // needs to say "something was here and got removed", not keep the
    // actual (possibly heretical) file sitting around
    if (message.attachmentFilename) {
      const filePath = join(process.cwd(), 'uploads', 'attachments', message.attachmentFilename);
      unlink(filePath).catch(() => {});
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: '',
        attachmentFilename: null,
        attachmentType: null,
        attachmentName: null,
        deletedAt: new Date(),
        deletedById,
      },
      include: DELETED_MESSAGE_SELECT,
    });
  }

  async getUserRole(userId: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? null;
  }
}
