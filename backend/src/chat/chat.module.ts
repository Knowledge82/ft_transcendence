import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';

// We re-register JwtModule.register({...}), even though it's already registered in AuthModule. 
// This is intentional: each Nest module is isolated by default, and the JwtService configured 
// in AuthModule isn't automatically visible in ChatModule unless explicitly included via imports/exports. Since the configuration is identical (same secret), it's easier to independently re-register JwtModule in ChatModule than to fence exports between modules—this is standard practice for lightweight, self-contained configurations like this.
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [ChatGateway],
})
export class ChatModule {}
