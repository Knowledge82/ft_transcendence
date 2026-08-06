import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
export declare class ChatController {
    private readonly chatService;
    private readonly chatGateway;
    constructor(chatService: ChatService, chatGateway: ChatGateway);
    getGeneralChannel(): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
    }>;
    getGeneralMembers(): Promise<{
        isOnline: boolean;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
    }[]>;
    getDirectConversations(req: any): Promise<{
        otherUser: {
            isOnline: boolean;
            displayName: string | null;
            id: number;
            avatarUrl: string | null;
        } | null;
        id: number;
    }[]>;
    startDirectConversation(req: any, otherUserId: number): Promise<{
        id: number;
        type: import("@prisma/client").$Enums.ConversationType;
        name: string | null;
        createdAt: Date;
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
