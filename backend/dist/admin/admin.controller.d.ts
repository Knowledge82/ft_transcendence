import { AdminService } from './admin.service';
import { ChatGateway } from '../chat/chat.gateway';
export declare class AdminController {
    private readonly adminService;
    private readonly chatGateway;
    constructor(adminService: AdminService, chatGateway: ChatGateway);
    listUsers(): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    changeRole(id: number, role: string): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
    }>;
    deleteUser(id: number): Promise<void>;
}
