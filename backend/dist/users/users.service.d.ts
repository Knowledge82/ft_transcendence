import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: number): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    findPublicProfile(userId: number): Promise<{
        id: number;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    updateProfile(userId: number, dto: UpdateProfileDto): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    updateAvatar(userId: number, avatarUrl: string): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
}
