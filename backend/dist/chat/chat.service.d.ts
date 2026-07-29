import { PrismaService } from '../prisma/prisma.service';
export declare class ChatService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOrCreateGeneralChannel(): Promise<{
        id: number;
        createdAt: Date;
        name: string | null;
        type: import("@prisma/client").$Enums.ConversationType;
    }>;
    getGeneralChannelMembers(): Promise<{
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    }[]>;
    ensureParticipant(conversationId: number, userId: number): Promise<void>;
    findOrCreateDirectConversation(userIdA: number, userIdB: number): Promise<{
        id: number;
        createdAt: Date;
        name: string | null;
        type: import("@prisma/client").$Enums.ConversationType;
    }>;
    getUserConversationIds(userId: number): Promise<number[]>;
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
