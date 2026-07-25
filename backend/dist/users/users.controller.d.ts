import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
    updateMe(req: any, dto: UpdateProfileDto): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
    uploadAvatar(req: any, file: Express.Multer.File): Promise<{
        id: number;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
}
