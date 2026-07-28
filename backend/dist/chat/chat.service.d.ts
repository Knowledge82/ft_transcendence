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
    ensureParticipant(conversationId: number, userId: number): Promise<void>;
    findOrCreateDirectConversation(userIdA: number, userIdB: number): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
    }>;
    getUserConversationIds(userId: number): Promise<number[]>;
    isParticipant(conversationId: number, userId: number): Promise<boolean>;
    saveMessage(conversationId: number, senderId: number, content: string): Promise<{
        sender: {
            id: number;
            displayName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        content: string;
        conversationId: number;
        senderId: number;
    }>;
    getMessageHistory(conversationId: number, userId: number, limit?: number): Promise<({
        sender: {
            id: number;
            displayName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: number;
        createdAt: Date;
        content: string;
        conversationId: number;
        senderId: number;
    })[]>;
}
