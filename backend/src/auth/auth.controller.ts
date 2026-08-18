import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { FortyTwoProfile } from './strategies/oauth-fortytwo.strategy';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, must match REFRESH_TOKEN_TTL_DAYS in auth.service.ts
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://localhost:8443';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Headers('accept-language') language: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.register(dto, language);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Get('oauth/42')
  @UseGuards(AuthGuard('fortytwo'))
  async fortyTwoLogin() {}

  @Get('oauth/42/callback')
  @UseGuards(AuthGuard('fortytwo'))
  async fortyTwoCallback(@Req() req: Request & { user: FortyTwoProfile }, @Res() res: Response) {
    const result = await this.authService.handleFortyTwoLogin(req.user);

    if (!result.isNewAccount) {
      this.setRefreshCookie(res, result.refreshToken);
      return res.redirect(`${FRONTEND_URL}/oauth/exito`);
    }

    return res.redirect(`${FRONTEND_URL}/oauth/completar?token=${result.pendingToken}`);
  }

  @Post('oauth/complete')
  async completeOAuth(
    @Body('pendingToken') pendingToken: string,
    @Body('gender') gender: string,
    @Body('displayName') displayName: string,
    @Headers('accept-language') language: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.completeOAuthRegistration(
      pendingToken,
      gender,
      displayName,
      language,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { accessToken, refreshToken } = await this.authService.refresh(oldRefreshToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME);
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true, // inaccessible to JavaScript — protects against XSS token theft
      secure: true, // sent only over HTTPS — we already enforce this via nginx
      sameSite: 'strict', // not sent on cross-site requests — protects against CSRF
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: '/api/auth', // cookie only sent to auth endpoints, not the whole app
    });
  }
}
