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
    const secret = process.env.JWT_SECRET;

    // Fallamos rápido y con un mensaje claro si falta la variable de entorno,
    // en lugar de dejar que Passport falle más adelante con un error críptico
    if (!secret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }

    super({
      // Busca el token en la cabecera: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // los tokens expirados se rechazan automáticamente
      secretOrKey: secret,
    });
  }

  // Passport llama a este método automáticamente si la firma del token es válida.
  // Lo que devolvemos aquí se inyecta en request.user en los controladores.
  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
