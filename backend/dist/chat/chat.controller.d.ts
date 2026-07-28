import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getGeneralChannel(): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
    }>;
    startDirectConversation(req: any, otherUserId: number): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
    }>;
    getHistory(req: any, conversationId: number): Promise<({
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
