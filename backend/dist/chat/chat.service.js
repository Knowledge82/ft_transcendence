"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const GENERAL_CHANNEL_NAME = 'general';
let ChatService = class ChatService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async ensureParticipant(conversationId, userId) {
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
    async getUserBasicInfo(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, displayName: true, avatarUrl: true },
        });
    }
    async findOrCreateDirectConversation(userIdA, userIdB) {
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
    async getUserConversationIds(userId) {
        const rows = await this.prisma.conversationParticipant.findMany({
            where: { userId },
            select: { conversationId: true },
        });
        return rows.map((r) => r.conversationId);
    }
    async isParticipant(conversationId, userId) {
        const row = await this.prisma.conversationParticipant.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
        });
        return row !== null;
    }
    async saveMessage(conversationId, senderId, content) {
        const allowed = await this.isParticipant(conversationId, senderId);
        if (!allowed) {
            throw new common_1.ForbiddenException('You are not part of this conversation');
        }
        return this.prisma.message.create({
            data: { conversationId, senderId, content },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });
    }
    async getMessageHistory(conversationId, userId, limit = 50) {
        const allowed = await this.isParticipant(conversationId, userId);
        if (!allowed) {
            throw new common_1.ForbiddenException('You are not part of this conversation');
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
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map