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
    const isFirstConnection = existing.size === 0;
    existing.add(client.id);
    this.onlineUsers.set(payload.sub, existing);

    if (isFirstConnection) {
      this.server.emit('userStatusChanged', { userId: payload.sub, isOnline: true });
    }

    const general = await this.chatService.getOrCreateGeneralChannel();
    const isNewMember = await this.chatService.ensureParticipant(general.id, payload.sub);
    if (isNewMember) {
      const user = await this.chatService.getUserBasicInfo(payload.sub);
      this.server.emit('memberJoined', { ...user, isOnline: true });
    }
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
      this.server.emit('userStatusChanged', { userId, isOnline: false });
      console.log(`User ${userId} is now offline`);
    }
  }

  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  // Broadcasts to literally everyone connected — for events that aren't
  // targeted at anyone in particular, like a new entry in the public
  // community chronicle
  broadcastToAll(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }

  notifyUser(userId: number, event: string, payload: unknown) {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      return;
    }
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  // Joins ALL of a user's currently active sockets (every open tab) to a
  // conversation room, right when that conversation is created — without
  // this, a DM created after the socket already connected would never be
  // joined, and messages sent in it wouldn't reach the sender's own live
  // view until the page (and socket) reload
  joinConversationRoom(userId: number, conversationId: number) {
    const socketIds = this.onlineUsers.get(userId);
    if (!socketIds) {
      return;
    }
    for (const socketId of socketIds) {
      this.server.sockets.sockets.get(socketId)?.join(roomName(conversationId));
    }
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
      throw new WsException(error.message ?? 'Could not send message');
    }

    this.server.to(roomName(payload.conversationId)).emit('newMessage', message);

    return message;
  }
}
