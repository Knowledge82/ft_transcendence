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
exports.FriendsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const friends_service_1 = require("./friends.service");
const chat_gateway_1 = require("../chat/chat.gateway");
const community_service_1 = require("../community/community.service");
let FriendsController = class FriendsController {
    friendsService;
    chatGateway;
    communityService;
    constructor(friendsService, chatGateway, communityService) {
        this.friendsService = friendsService;
        this.chatGateway = chatGateway;
        this.communityService = communityService;
    }
    async listFriends(req) {
        const friends = await this.friendsService.listFriends(req.user.userId);
        return friends.map((friend) => ({
            ...friend,
            isOnline: this.chatGateway.isUserOnline(friend.id),
        }));
    }
    async listPendingRequests(req) {
        return this.friendsService.listPendingRequests(req.user.userId);
    }
    async sendRequest(req, addresseeId) {
        const friendship = await this.friendsService.sendRequest(req.user.userId, addresseeId);
        this.chatGateway.notifyUser(addresseeId, 'friendRequestReceived', friendship);
        return friendship;
    }
    async acceptRequest(req, requesterId) {
        const friendship = await this.friendsService.acceptRequest(req.user.userId, requesterId);
        const accepter = await this.friendsService.getBasicInfo(req.user.userId);
        this.chatGateway.notifyUser(requesterId, 'friendRequestAccepted', accepter);
        const requester = await this.friendsService.getBasicInfo(requesterId);
        const accepterName = accepter?.displayName ?? `Usuario ${accepter?.id}`;
        const requesterName = requester?.displayName ?? `Usuario ${requester?.id}`;
        await this.communityService.createEvent('FRIENDSHIP_ACCEPTED', `${requesterName} y ${accepterName} han jurado hermandad ante el Verdadero Relink.`);
        return friendship;
    }
    async removeFriendship(req, otherUserId) {
        await this.friendsService.removeFriendship(req.user.userId, otherUserId);
    }
};
exports.FriendsController = FriendsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "listFriends", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "listPendingRequests", null);
__decorate([
    (0, common_1.Post)('request/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "sendRequest", null);
__decorate([
    (0, common_1.Post)(':userId/accept'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "acceptRequest", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "removeFriendship", null);
exports.FriendsController = FriendsController = __decorate([
    (0, common_1.Controller)('friends'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [friends_service_1.FriendsService,
        chat_gateway_1.ChatGateway,
        community_service_1.CommunityService])
], FriendsController);
//# sourceMappingURL=friends.controller.js.map