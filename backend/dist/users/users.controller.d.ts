import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChatGateway } from '../chat/chat.gateway';
export declare class UsersController {
    private readonly usersService;
    private readonly chatGateway;
    constructor(usersService: UsersService, chatGateway: ChatGateway);
    getMe(req: any): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        createdAt: Date;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
    }>;
    updateMe(req: any, dto: UpdateProfileDto): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        createdAt: Date;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
    }>;
    uploadAvatar(req: any, file: Express.Multer.File): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        createdAt: Date;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
    }>;
    getPublicProfile(id: number): Promise<{
        isOnline: boolean;
        displayName: string | null;
        id: number;
        createdAt: Date;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
