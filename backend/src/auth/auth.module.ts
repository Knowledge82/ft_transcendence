import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FortyTwoStrategy } from './strategies/oauth-fortytwo.strategy';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    CommunityModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, FortyTwoStrategy],
})
export class AuthModule {}
