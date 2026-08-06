import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
export declare class CommunityService implements OnModuleInit {
    private readonly prisma;
    private readonly chatGateway;
    private readonly groq;
    constructor(prisma: PrismaService, chatGateway: ChatGateway);
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
    getTodayEvents(): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }[]>;
    createUserRegisteredEvent(name: string): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    createRoleChangedEvent(name: string, role: string): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    createFriendshipAcceptedEvent(nameA: string, nameB: string): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    createFriendshipBrokenEvent(nameA: string, nameB: string): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    createStaticFictionalEvent(): Promise<{
        type: string;
        message: string;
        createdAt: Date;
        id: number;
    }>;
    private generateAiFictionalEvent;
}
