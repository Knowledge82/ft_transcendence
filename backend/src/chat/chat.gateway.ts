import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

interface JwtPayload {
  sub: number;
  email: string;
}

interface SendMessagePayload {
  conversationId: number;
  content: string;
}

// Room naming convention: every conversation gets its own Socket.IO room,
// named "conversation:<id>". Joining a room lets us broadcast to exactly
// the people in that chat, instead of everyone connected to the server.
const roomName = (conversationId: number) => `conversation:${conversationId}`;

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  private onlineUsers = new Map<number, Set<string>>();

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      client.disconnect();
      return;
    }

    client.data.userId = payload.sub;

    const existing = this.onlineUsers.get(payload.sub) ?? new Set<string>();
    existing.add(client.id);
    this.onlineUsers.set(payload.sub, existing);

    // Auto-join every room this user is part of: the general channel,
    // plus every existing direct conversation. This means as soon as
    // someone connects, they're ready to receive messages broadcast to
    // any of their chats, without having to manually subscribe to each one.
    const general = await this.chatService.getOrCreateGeneralChannel();
    await this.chatService.ensureParticipant(general.id, payload.sub);
    const conversationIds = await this.chatService.getUserConversationIds(payload.sub);
    const allRoomIds = new Set([general.id, ...conversationIds]);

    for (const id of allRoomIds) {
      client.join(roomName(id));
    }

    console.log(`User ${payload.sub} connected (socket ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (!userId) {
      return;
    }

    const sockets = this.onlineUsers.get(userId);
    sockets?.delete(client.id);

    if (sockets && sockets.size === 0) {
      this.onlineUsers.delete(userId);
      console.log(`User ${userId} is now offline`);
    }
  }

  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const senderId = client.data.userId as number;

    let message;
    try {
      message = await this.chatService.saveMessage(
        payload.conversationId,
        senderId,
        payload.content,
      );
    } catch (error) {
      // HTTP-style exceptions (ForbiddenException, etc.) don't serialize
      // cleanly over WebSocket — WsException is what the Gateway's
      // exception layer knows how to turn into a proper 'exception' event
      throw new WsException(error.message ?? 'Could not send message');
    }

    this.server.to(roomName(payload.conversationId)).emit('newMessage', message);

    return message;
  }
}
