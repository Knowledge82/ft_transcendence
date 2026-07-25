import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: number): Promise<{
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        id: number;
    }>;
    updateProfile(userId: number, dto: UpdateProfileDto): Promise<{
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        id: number;
    }>;
    updateAvatar(userId: number, avatarUrl: string): Promise<{
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        id: number;
    }>;
}
