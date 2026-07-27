import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    server: Server;
    constructor(jwtService: JwtService);
    private onlineUsers;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    isUserOnline(userId: number): boolean;
    handlePing(): string;
}
