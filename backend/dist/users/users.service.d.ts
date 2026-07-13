import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: number): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
}
