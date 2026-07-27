import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

// We declare a type (not a class, not a decorator—just a description of the object's form) named JwtPayload. 
// It describes what we expect to find inside the JWT token's payload after successful validation
// — the same as we already declared in JwtStrategy.ts for HTTP authentication: a sub field (the standard field name in JWT tokens for the "subject," i.e., the token owner's identifier—in our case, this is the user ID) of type number, and an email of type string.
interface JwtPayload {
  sub: number;
  email: string;
}

// cors: true enables CORS (Cross-Origin Resource Sharing) support for this Gateway—a browser security mechanism that regulates which domains are allowed to connect to this server. 
// We set this to true, which means "allow everyone"—a simplified setting for development (production typically specifies a specific list of allowed domains, rather than true).
@WebSocketGateway({ cors: true })

  // "implements" in TypeScript means "this class undertakes to provide all methods defined in the listed interfaces." 
  // Since we wrote implements OnGatewayConnection, TypeScript requires the class to contain a handleConnection method with a specific signature (otherwise, there will be a compilation error). 
  // Similarly, for OnGatewayDisconnect, it will require handleDisconnect. A single class can implement multiple interfaces at once, separated by commas.
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  // In-memory map of userId -> set of socket ids. A single user can have
  // several connections at once (multiple browser tabs), so we track a
  // SET of socket ids per user, not just one. This lives only in this
  // server instance's memory — fine for a single backend container, but
  // would need a shared store (e.g. Redis) if we ever ran multiple
  // backend replicas behind a load balancer.
  private onlineUsers = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    
    // We read what the client passed when connecting via { auth: { token } }. 
    // An optional chain in case auth was not passed at all.
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      client.disconnect();
      return;
    }

    let payload: JwtPayload;
    
    // jwtService.verify() throws an exception if the signature is invalid or the token has expired 
    // (as opposed to, say, returning null) - this is the default behavior of the jsonwebtoken library 
    // on which @nestjs/jwt is based.
    try {

      // The same JWT verification logic we used in JwtStrategy for HTTP, 
      // but here we call JwtService directly, without the Passport wrapper 
      // (Passport strategies are designed for Express HTTP requests; 
      // for WebSocket, you have to bypass them and check the token manually).
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      // Invalid or expired token — refuse the connection entirely
      client.disconnect();
      return;
    }

    // client.data - special Socket.IO object for storing arbitrary data tied to a specific connection;
    // it lives as long as the socket is open. 
    // We store the userId there once upon connection, so that all subsequent event handlers 
    // can access client.data.userId without rechecking the token for each message.
    client.data.userId = payload.sub;

    const existing = this.onlineUsers.get(payload.sub) ?? new Set<string>();
    existing.add(client.id);
    this.onlineUsers.set(payload.sub, existing);

    console.log(`User ${payload.sub} connected (socket ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (!userId) {
      return;
    }

    const sockets = this.onlineUsers.get(userId);
    sockets?.delete(client.id);

    // Only truly "offline" once ALL of that user's connections are gone
    // (they might have closed one tab but still have another open)
    if (sockets && sockets.size === 0) {
      this.onlineUsers.delete(userId);
      console.log(`User ${userId} is now offline`);
    }
  }

  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }
}
