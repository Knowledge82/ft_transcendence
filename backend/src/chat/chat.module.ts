import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AttachmentsController } from './attachments.controller';
import { JwtQueryOrHeaderGuard } from './jwt-query-or-header.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [ChatController, AttachmentsController],
  providers: [ChatGateway, ChatService, JwtQueryOrHeaderGuard],
  exports: [ChatGateway],
})
export class ChatModule {}
