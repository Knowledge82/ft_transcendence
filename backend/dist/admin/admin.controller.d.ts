import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    listUsers(): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    changeRole(id: number, role: string): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        role: import("@prisma/client").$Enums.Role;
    }>;
    deleteUser(id: number): Promise<void>;
}
