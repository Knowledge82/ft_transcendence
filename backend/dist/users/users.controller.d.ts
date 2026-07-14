import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        email: string;
        displayName: string | null;
        id: number;
        avatarUrl: string | null;
        createdAt: Date;
    }>;
}
