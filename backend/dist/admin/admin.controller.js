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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const admin_service_1 = require("./admin.service");
const chat_gateway_1 = require("../chat/chat.gateway");
const community_service_1 = require("../community/community.service");
let AdminController = class AdminController {
    adminService;
    chatGateway;
    communityService;
    constructor(adminService, chatGateway, communityService) {
        this.adminService = adminService;
        this.chatGateway = chatGateway;
        this.communityService = communityService;
    }
    async listUsers() {
        return this.adminService.listUsers();
    }
    async changeRole(id, role) {
        const updated = await this.adminService.changeRole(id, role);
        this.chatGateway.notifyUser(id, 'roleChanged', { role: updated.role });
        const name = updated.displayName ?? `Usuario ${updated.id}`;
        await this.communityService.createEvent('ROLE_CHANGED', `${name} ha alcanzado el rango de ${updated.role}.`);
        return updated;
    }
    async deleteUser(id) {
        await this.adminService.deleteUser(id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/role'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "changeRole", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ARZOBISPO'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        chat_gateway_1.ChatGateway,
        community_service_1.CommunityService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map