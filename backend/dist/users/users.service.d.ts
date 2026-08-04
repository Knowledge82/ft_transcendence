import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: number): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    findPublicProfile(userId: number): Promise<{
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    updateProfile(userId: number, dto: UpdateProfileDto): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    updateAvatar(userId: number, avatarUrl: string): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
}
