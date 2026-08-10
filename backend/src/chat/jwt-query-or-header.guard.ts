import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface JwtPayload {
  sub: number;
  email: string;
}

// Regular API calls carry the JWT in the Authorization header (via our
// axios interceptor). But plain browser-native requests — <img src="...">,
// <a href="...">, opening a link in a new tab — can NOT attach custom
// headers. This guard accepts the token from either place, specifically
// for routes that need to work when linked/embedded directly in HTML.
@Injectable()
export class JwtQueryOrHeaderGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization as string | undefined;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const queryToken = request.query.token as string | undefined;
    const token = headerToken ?? queryToken;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
      request.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
