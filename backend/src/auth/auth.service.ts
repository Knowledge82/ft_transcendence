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

    // Same generic message whether the account doesn't exist, or exists
    // but was created via 42 OAuth and has no password at all — this
    // deliberately doesn't reveal WHICH case it is, avoiding leaking
    // whether a given email is registered
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(user.id, user.email);
  }

  // Called right after 42 hands back the person's profile. Two
  // outcomes: they already have an account linked to this 42 id (log
  // them in normally), or this is their first time (issue a short-lived
  // token carrying their 42 profile data, instead of creating the
  // account immediately — we still need them to pick a gender, and to
  // confirm/change their display name if it's already taken).
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

  // The second half of the 42 signup flow — called once the person has
  // picked a gender on the "complete your registration" page. Re-runs
  // the same uniqueness checks as normal registration (someone else
  // could have taken the name, or even registered the same email
  // normally, in the few minutes since the pending token was issued).
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

    // Prefer whatever the person chose on the completion form — only
    // fall back to their 42 login if they left it untouched or the
    // field was somehow omitted
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
        // passwordHash stays null — this account can only sign in
        // through 42 again, never with an email/password form
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
