import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// No decorator options needed yet — Socket.IO defaults to serving on
// the same HTTP server, at the path /socket.io/, which is exactly what
// our nginx config already proxies (we set that up back when building
// the infrastructure, anticipating this).
@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  // Nest injects the underlying Socket.IO server instance here,
  // giving access to broadcast to all connected clients if needed later
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Just for testing: the client sends 'ping', the server replies 'pong'
  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }
}
