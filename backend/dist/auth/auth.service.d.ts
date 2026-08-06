import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CommunityService } from '../community/community.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly communityService;
    constructor(prisma: PrismaService, jwtService: JwtService, communityService: CommunityService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(rawToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(rawToken: string): Promise<void>;
    private issueTokens;
}
