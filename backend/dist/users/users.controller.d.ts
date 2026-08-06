import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChatGateway } from '../chat/chat.gateway';
export declare class UsersController {
    private readonly usersService;
    private readonly chatGateway;
    constructor(usersService: UsersService, chatGateway: ChatGateway);
    getMe(req: any): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    updateMe(req: any, dto: UpdateProfileDto): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    uploadAvatar(req: any, file: Express.Multer.File): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    getPublicProfile(id: number): Promise<{
        isOnline: boolean;
        id: number;
        displayName: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
}
