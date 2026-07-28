import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getGeneralChannel(): Promise<{
        id: number;
        createdAt: Date;
        name: string | null;
        type: import("@prisma/client").$Enums.ConversationType;
    }>;
    startDirectConversation(req: any, otherUserId: number): Promise<{
        id: number;
        createdAt: Date;
        name: string | null;
        type: import("@prisma/client").$Enums.ConversationType;
    }>;
    getHistory(req: any, conversationId: number): Promise<({
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
