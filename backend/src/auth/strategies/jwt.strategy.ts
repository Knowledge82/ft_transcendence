import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Busca el token en la cabecera: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // los tokens expirados se rechazan automáticamente
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // Passport llama a este método automáticamente si la firma del token es válida.
  // Lo que devolvemos aquí se inyecta en request.user en los controladores.
  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
