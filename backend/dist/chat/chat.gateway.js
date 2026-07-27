"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
let ChatGateway = class ChatGateway {
    jwtService;
    server;
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    onlineUsers = new Map();
    handleConnection(client) {
        const token = client.handshake.auth?.token;
        if (!token) {
            client.disconnect();
            return;
        }
        let payload;
        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
        }
        catch {
            client.disconnect();
            return;
        }
        client.data.userId = payload.sub;
        const existing = this.onlineUsers.get(payload.sub) ?? new Set();
        existing.add(client.id);
        this.onlineUsers.set(payload.sub, existing);
        console.log(`User ${payload.sub} connected (socket ${client.id})`);
    }
    handleDisconnect(client) {
        const userId = client.data.userId;
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
    isUserOnline(userId) {
        return this.onlineUsers.has(userId);
    }
    handlePing() {
        return 'pong';
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], ChatGateway.prototype, "handlePing", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map