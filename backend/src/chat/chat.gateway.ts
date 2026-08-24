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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatService } from './chat.service';

interface JwtPayload {
  sub: number;
  email: string;
}

interface SendMessagePayload {
  conversationId: number;
  content: string;
  attachmentFilename?: string;
  attachmentType?: string;
  attachmentName?: string;
}

const roomName = (conversationId: number) => `conversation:${conversationId}`;

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly eventEmitter: EventEmitter2,
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

    const general = await this.chatService.getOrCreateGeneralChannel();

    if (isFirstConnection) {
      this.server.emit('userStatusChanged', { userId: payload.sub, isOnline: true });
      // Fire-and-forget — this is a "nice to have" chat announcement, not
      // something the connection flow itself should ever wait on or fail over
      this.announceIfArzobispo(payload.sub, general.id, true).catch(() => {});
    }

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

      this.chatService.getOrCreateGeneralChannel().then((general) => {
        this.announceIfArzobispo(userId, general.id, false).catch(() => {});
      });
    }
  }

  // Only the top rank warrants an announcement in the chat feed itself —
  // for ordinary Hermanos, the presence dot in the sidebar is already
  // enough; a message for every single connect/disconnect would just be
  // noise. Ephemeral by design: not persisted anywhere, only broadcast
  // live to whoever currently has the general channel open.
  private async announceIfArzobispo(userId: number, generalChannelId: number, isOnline: boolean) {
    const info = await this.chatService.getUserRoleAndGender(userId);
    if (info?.role !== 'ARZOBISPO') {
      return;
    }
    const payload = { gender: info.gender, isOnline };
    this.server.to(roomName(generalChannelId)).emit('arzobispoPresenceChanged', payload);
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

  // Broadcasts only to the people currently in a specific conversation —
  // used when a message gets deleted, so it disappears live for everyone
  // in that chat without bothering unrelated users
  broadcastToRoom(conversationId: number, event: string, payload: unknown) {
    this.server.to(roomName(conversationId)).emit(event, payload);
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

  // Symmetric to joinConversationRoom, for the opposite case — someone
  // leaving a faction (or being expelled) should stop receiving that
  // channel's live messages immediately, not just after their next reload
  leaveConversationRoom(userId: number, conversationId: number) {
    const socketIds = this.onlineUsers.get(userId);
    if (!socketIds) {
      return;
    }
    for (const socketId of socketIds) {
      this.server.sockets.sockets.get(socketId)?.leave(roomName(conversationId));
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
        payload.attachmentFilename
          ? {
              filename: payload.attachmentFilename,
              type: payload.attachmentType ?? 'application/octet-stream',
              name: payload.attachmentName ?? payload.attachmentFilename,
            }
          : undefined,
      );
    } catch (error) {
      throw new WsException(error.message ?? 'Could not send message');
    }

    this.server.to(roomName(payload.conversationId)).emit('newMessage', message);

    // Only for private conversations — the general channel is far too
    // busy to notify on every single message sent there
    const general = await this.chatService.getOrCreateGeneralChannel();
    if (payload.conversationId !== general.id) {
      const recipientId = await this.chatService.getOtherParticipantId(
        payload.conversationId,
        senderId,
      );
      if (recipientId) {
        const senderName = message.sender.displayName ?? `Usuario ${senderId}`;
        // Emitted, not called directly — ChatGateway has no idea who (if
        // anyone) is listening for this. NotificationsService happens to
        // be, but ChatModule never needs to import NotificationsModule
        // to make that work, which is exactly what breaks the circular
        // dependency the direct-injection approach had.
        this.eventEmitter.emit('directMessage.sent', { recipientId, senderName });
      }
    }

    return message;
  }
}
