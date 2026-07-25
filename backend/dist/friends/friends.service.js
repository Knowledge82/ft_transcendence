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
exports.FriendsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FriendsService = class FriendsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendRequest(requesterId, addresseeId) {
        if (requesterId === addresseeId) {
            throw new common_1.BadRequestException('You cannot send a friend request to yourself');
        }
        const addressee = await this.prisma.user.findUnique({ where: { id: addresseeId } });
        if (!addressee) {
            throw new common_1.NotFoundException('User not found');
        }
        const existing = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId, addresseeId },
                    { requesterId: addresseeId, addresseeId: requesterId },
                ],
            },
        });
        if (existing) {
            if (existing.status === 'ACCEPTED') {
                throw new common_1.ConflictException('You are already friends with this user');
            }
            throw new common_1.ConflictException('A friend request already exists between you two');
        }
        return this.prisma.friendship.create({
            data: { requesterId, addresseeId },
        });
    }
    async acceptRequest(userId, requesterId) {
        const friendship = await this.prisma.friendship.findUnique({
            where: { requesterId_addresseeId: { requesterId, addresseeId: userId } },
        });
        if (!friendship) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        if (friendship.addresseeId !== userId) {
            throw new common_1.ForbiddenException('You cannot accept this request');
        }
        return this.prisma.friendship.update({
            where: { id: friendship.id },
            data: { status: 'ACCEPTED' },
        });
    }
    async removeFriendship(userId, otherUserId) {
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: userId, addresseeId: otherUserId },
                    { requesterId: otherUserId, addresseeId: userId },
                ],
            },
        });
        if (!friendship) {
            throw new common_1.NotFoundException('Friendship not found');
        }
        await this.prisma.friendship.delete({ where: { id: friendship.id } });
    }
    async listFriends(userId) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                status: 'ACCEPTED',
                OR: [{ requesterId: userId }, { addresseeId: userId }],
            },
            include: {
                requester: { select: { id: true, displayName: true, avatarUrl: true } },
                addressee: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });
        return friendships.map((f) => f.requesterId === userId ? f.addressee : f.requester);
    }
    async listPendingRequests(userId) {
        return this.prisma.friendship.findMany({
            where: { addresseeId: userId, status: 'PENDING' },
            include: {
                requester: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });
    }
};
exports.FriendsService = FriendsService;
exports.FriendsService = FriendsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FriendsService);
//# sourceMappingURL=friends.service.js.map