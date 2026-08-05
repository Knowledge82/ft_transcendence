import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
interface SendMessagePayload {
    conversationId: number;
    content: string;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly chatService;
    server: Server;
    constructor(jwtService: JwtService, chatService: ChatService);
    private onlineUsers;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    isUserOnline(userId: number): boolean;
    notifyUser(userId: number, event: string, payload: unknown): void;
    joinConversationRoom(userId: number, conversationId: number): void;
    handleSendMessage(client: Socket, payload: SendMessagePayload): Promise<any>;
}
export {};
