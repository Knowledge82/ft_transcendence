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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
const roomName = (conversationId) => `conversation:${conversationId}`;
let ChatGateway = class ChatGateway {
    jwtService;
    chatService;
    server;
    constructor(jwtService, chatService) {
        this.jwtService = jwtService;
        this.chatService = chatService;
    }
    onlineUsers = new Map();
    async handleConnection(client) {
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
        const general = await this.chatService.getOrCreateGeneralChannel();
        await this.chatService.ensureParticipant(general.id, payload.sub);
        const conversationIds = await this.chatService.getUserConversationIds(payload.sub);
        const allRoomIds = new Set([general.id, ...conversationIds]);
        for (const id of allRoomIds) {
            client.join(roomName(id));
        }
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
    async handleSendMessage(client, payload) {
        const senderId = client.data.userId;
        let message;
        try {
            message = await this.chatService.saveMessage(payload.conversationId, senderId, payload.content);
        }
        catch (error) {
            throw new websockets_1.WsException(error.message ?? 'Could not send message');
        }
        this.server.to(roomName(payload.conversationId)).emit('newMessage', message);
        return message;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chat_service_1.ChatService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map