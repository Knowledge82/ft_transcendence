import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CommunityService } from '../community/community.service';
import { suggestAvailableNames } from './display-name-suggestions';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly communityService: CommunityService,
  ) {}

  async register(dto: RegisterDto, language?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException({ code: 'EMAIL_TAKEN' });
    }

    const existingName = await this.prisma.user.findFirst({
      where: { displayName: { equals: dto.displayName, mode: 'insensitive' } },
    });

    if (existingName) {
      const suggestions = await suggestAvailableNames(this.prisma, language, dto.gender);
      throw new ConflictException({ code: 'DISPLAY_NAME_TAKEN', suggestions });
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        gender: dto.gender,
      },
    });

    const name = user.displayName ?? `Usuario ${user.id}`;
    await this.communityService.createUserRegisteredEvent(name);

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(rawToken: string) {
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    return this.issueTokens(storedToken.user.id, storedToken.user.email);
  }

  async logout(rawToken: string) {
    if (!rawToken) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { token: rawToken },
      data: { revoked: true },
    });
  }

  private async issueTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }
}
