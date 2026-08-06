import { PrismaService } from '../prisma/prisma.service';
export declare class ChatService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOrCreateGeneralChannel(): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
    }>;
    getGeneralChannelMembers(): Promise<{
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    }[]>;
    ensureParticipant(conversationId: number, userId: number): Promise<boolean>;
    getUserBasicInfo(userId: number): Promise<{
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    } | null>;
    findOrCreateDirectConversation(userIdA: number, userIdB: number): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
    }>;
    getUserConversationIds(userId: number): Promise<number[]>;
    getUserDirectConversations(userId: number): Promise<{
        id: number;
        otherUser: {
            displayName: string | null;
            id: number;
            avatarUrl: string | null;
        } | null;
    }[]>;
    isParticipant(conversationId: number, userId: number): Promise<boolean>;
    saveMessage(conversationId: number, senderId: number, content: string): Promise<{
        sender: {
            displayName: string | null;
            id: number;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        conversationId: number;
        content: string;
        senderId: number;
    }>;
    getMessageHistory(conversationId: number, userId: number, limit?: number): Promise<({
        sender: {
            displayName: string | null;
            id: number;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        conversationId: number;
        content: string;
        senderId: number;
    })[]>;
}
