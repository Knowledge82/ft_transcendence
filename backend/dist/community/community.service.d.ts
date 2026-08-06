import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class CommunityService implements OnModuleInit {
    private readonly prisma;
    private readonly groq;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    createEvent(type: string, message: string): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    getRecentEvents(limit?: number): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }[]>;
    createStaticFictionalEvent(): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    private generateAiFictionalEvent;
}
