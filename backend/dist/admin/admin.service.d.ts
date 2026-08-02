import { PrismaService } from '../prisma/prisma.service';
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listUsers(): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    changeRole(userId: number, role: string): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        role: import("@prisma/client").$Enums.Role;
    }>;
    deleteUser(userId: number): Promise<void>;
}
