import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    updateMe(req: any, dto: UpdateProfileDto): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
    uploadAvatar(req: any, file: Express.Multer.File): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
}
