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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const ai_service_1 = require("./ai.service");
const user_throttler_guard_1 = require("./user-throttler.guard");
let AiController = class AiController {
    aiService;
    constructor(aiService) {
        this.aiService = aiService;
    }
    async confess(makefile, res) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Accel-Buffering', 'no');
        try {
            for await (const chunk of this.aiService.streamConfession(makefile)) {
                res.write(chunk);
            }
            res.end();
        }
        catch (error) {
            if (!res.headersSent) {
                const status = error instanceof common_1.HttpException ? error.getStatus() : 500;
                const message = error instanceof common_1.HttpException ? error.message : 'Error interno';
                res.status(status).json({ statusCode: status, message });
            }
            else {
                res.write('\n\n[Error: no se pudo completar la respuesta]');
                res.end();
            }
        }
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('confess'),
    (0, common_1.UseGuards)(user_throttler_guard_1.UserThrottlerGuard),
    __param(0, (0, common_1.Body)('makefile')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "confess", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map