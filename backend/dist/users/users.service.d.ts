import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: number): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
}
