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
      console.log(`[DEBUG] Primera conexión de userId=${payload.sub}, llamando announceIfArzobispo`);
      // Fire-and-forget — this is a "nice to have" chat announcement, not
      // something the connection flow itself should ever wait on or fail over
      this.announceIfArzobispo(payload.sub, general.id, true).catch((err) =>
        console.error('[DEBUG] Error en announceIfArzobispo (connect):', err),
      );
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
    console.log(`[DEBUG] handleDisconnect llamado, userId=${userId}, socket=${client.id}`);
    if (!userId) {
      console.log('[DEBUG] handleDisconnect: sin userId, saliendo');
      return;
    }

    const sockets = this.onlineUsers.get(userId);
    sockets?.delete(client.id);
    console.log(
      `[DEBUG] handleDisconnect: sockets restantes para userId=${userId}: ${sockets?.size}`,
    );

    if (sockets && sockets.size === 0) {
      this.onlineUsers.delete(userId);
      this.server.emit('userStatusChanged', { userId, isOnline: false });
      console.log(`User ${userId} is now offline`);

      this.chatService.getOrCreateGeneralChannel().then((general) => {
        console.log(`[DEBUG] Llamando announceIfArzobispo para userId=${userId}, isOnline=false`);
        this.announceIfArzobispo(userId, general.id, false).catch((err) =>
          console.error('[DEBUG] Error en announceIfArzobispo (disconnect):', err),
        );
      });
    }
  }

  // Only the top rank warrants an announcement in the chat feed itself —
  // for ordinary Hermanos, the presence dot in the sidebar is already
  // enough; a message for every single connect/disconnect would just be
  // noise. Ephemeral by design: not persisted anywhere, only broadcast
  // live to whoever currently has the general channel open.
  private async announceIfArzobispo(userId: number, generalChannelId: number, isOnline: boolean) {
    const role = await this.chatService.getUserRole(userId);
    console.log(
      `[DEBUG] announceIfArzobispo: userId=${userId}, role="${role}", isOnline=${isOnline}`,
    );
    if (role !== 'ARZOBISPO') {
      console.log('[DEBUG] announceIfArzobispo: rol no es ARZOBISPO, saliendo');
      return;
    }
    const user = await this.chatService.getUserBasicInfo(userId);
    const payload = {
      name: user?.displayName ?? `Usuario ${userId}`,
      isOnline,
    };
    console.log(
      `[DEBUG] Emitiendo arzobispoPresenceChanged a room=${roomName(generalChannelId)}:`,
      payload,
    );
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

    return message;
  }
}
