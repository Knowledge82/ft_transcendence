import { Controller, Get, Post, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('general')
  async getGeneralChannel() {
    return this.chatService.getOrCreateGeneralChannel();
  }

  @Post('dm/:userId')
  async startDirectConversation(
    @Request() req,
    @Param('userId', ParseIntPipe) otherUserId: number,
  ) {
    return this.chatService.findOrCreateDirectConversation(req.user.userId, otherUserId);
  }

  @Get(':conversationId/messages')
  async getHistory(
    @Request() req,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.getMessageHistory(conversationId, req.user.userId);
  }
}
