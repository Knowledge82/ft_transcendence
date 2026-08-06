import { PrismaService } from '../prisma/prisma.service';
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listUsers(): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    changeRole(userId: number, role: string): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
    }>;
    deleteUser(userId: number): Promise<void>;
}
