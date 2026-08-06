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
exports.CommunityController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const community_service_1 = require("./community.service");
let CommunityController = class CommunityController {
    communityService;
    constructor(communityService) {
        this.communityService = communityService;
    }
    async getFeed() {
        return this.communityService.getRecentEvents();
    }
    async getTodayFeed() {
        return this.communityService.getTodayEvents();
    }
};
exports.CommunityController = CommunityController;
__decorate([
    (0, common_1.Get)('feed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommunityController.prototype, "getFeed", null);
__decorate([
    (0, common_1.Get)('feed/today'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommunityController.prototype, "getTodayFeed", null);
exports.CommunityController = CommunityController = __decorate([
    (0, common_1.Controller)('community'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [community_service_1.CommunityService])
], CommunityController);
//# sourceMappingURL=community.controller.js.map