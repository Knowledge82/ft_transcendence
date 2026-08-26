import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CommunityService } from '../community/community.service';
import { suggestAvailableNames } from './display-name-suggestions';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const TWO_FACTOR_PENDING_TTL = '5m';
const TWO_FACTOR_ISSUER = 'La Iglesia del Verdadero Relink';

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

    const tokens = await this.issueTokens(user.id, user.email);
    return { requiresTwoFactor: false as const, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.twoFactorEnabled) {
      const pendingToken = this.jwtService.sign(
        { sub: user.id, purpose: 'two-factor' },
        { secret: process.env.JWT_SECRET, expiresIn: TWO_FACTOR_PENDING_TTL },
      );
      return { requiresTwoFactor: true as const, pendingToken };
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { requiresTwoFactor: false as const, ...tokens };
  }

  async verifyTwoFactorLogin(pendingToken: string, code: string) {
    let payload: { sub: number; purpose: string };
    try {
      payload = this.jwtService.verify(pendingToken, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException({ code: 'TWO_FACTOR_TOKEN_EXPIRED' });
    }
    if (payload.purpose !== 'two-factor') {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      throw new UnauthorizedException();
    }

    const isValid = (await verifyTotp({ token: code, secret: user.twoFactorSecret })).valid;
    if (!isValid) {
      throw new UnauthorizedException({ code: 'INVALID_TWO_FACTOR_CODE' });
    }

    return this.issueTokens(user.id, user.email);
  }

  async setupTwoFactor(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (!user.passwordHash) {
      throw new ForbiddenException({ code: 'TWO_FACTOR_REQUIRES_PASSWORD' });
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: TWO_FACTOR_ISSUER, label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { qrCodeDataUrl, secret };
  }

  async confirmTwoFactor(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException({ code: 'TWO_FACTOR_NOT_SETUP' });
    }

    const isValid = (await verifyTotp({ token: code, secret: user.twoFactorSecret })).valid;
    if (!isValid) {
      throw new BadRequestException({ code: 'INVALID_TWO_FACTOR_CODE' });
    }

    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    return { enabled: true };
  }

  async disableTwoFactor(userId: number, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException();
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException({ code: 'INVALID_PASSWORD' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { enabled: false };
  }

  async handleFortyTwoLogin(profile: {
    intraId: number;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { intraId: profile.intraId } });
    if (existing) {
      const tokens = await this.issueTokens(existing.id, existing.email);
      return { isNewAccount: false as const, ...tokens };
    }

    const pendingToken = this.jwtService.sign(profile, {
      secret: process.env.JWT_SECRET,
      expiresIn: '10m',
    });
    return { isNewAccount: true as const, pendingToken };
  }

  async completeOAuthRegistration(
    pendingToken: string,
    gender: string,
    displayName: string | undefined,
    language?: string,
  ) {
    let profile: { intraId: number; email: string; displayName: string; avatarUrl: string | null };
    try {
      profile = this.jwtService.verify(pendingToken, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException({ code: 'OAUTH_TOKEN_EXPIRED' });
    }

    const existingByIntra = await this.prisma.user.findUnique({
      where: { intraId: profile.intraId },
    });
    if (existingByIntra) {
      return this.issueTokens(existingByIntra.id, existingByIntra.email);
    }

    const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (existingByEmail) {
      throw new ConflictException({ code: 'EMAIL_TAKEN' });
    }

    const finalDisplayName = displayName?.trim() || profile.displayName;

    const existingName = await this.prisma.user.findFirst({
      where: { displayName: { equals: finalDisplayName, mode: 'insensitive' } },
    });
    if (existingName) {
      const suggestions = await suggestAvailableNames(this.prisma, language, gender);
      throw new ConflictException({ code: 'DISPLAY_NAME_TAKEN', suggestions });
    }

    const user = await this.prisma.user.create({
      data: {
        email: profile.email,
        intraId: profile.intraId,
        displayName: finalDisplayName,
        avatarUrl: profile.avatarUrl,
        gender: gender as 'MASCULINO' | 'FEMENINO',
      },
    });

    const name = user.displayName ?? `Usuario ${user.id}`;
    await this.communityService.createUserRegisteredEvent(name);

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

    const { token, expiresAt } = this.buildRefreshToken();

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { token, expiresAt },
    });

    return {
      accessToken: this.signAccessToken(storedToken.user.id, storedToken.user.email),
      refreshToken: token,
    };
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

  private signAccessToken(userId: number, email: string) {
    return this.jwtService.sign(
      { sub: userId, email },
      { secret: process.env.JWT_SECRET, expiresIn: ACCESS_TOKEN_TTL },
    );
  }
  private buildRefreshToken() {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    return { token, expiresAt };
  }
  private async issueTokens(userId: number, email: string) {
    const { token, expiresAt } = this.buildRefreshToken();

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return {
      accessToken: this.signAccessToken(userId, email),
      refreshToken: token,
    };
  }
}
