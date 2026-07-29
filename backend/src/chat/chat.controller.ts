import { Controller, Get, Post, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('general')
  async getGeneralChannel() {
    return this.chatService.getOrCreateGeneralChannel();
  }

  @Get('general/members')
  async getGeneralMembers() {
    const members = await this.chatService.getGeneralChannelMembers();
    return members.map((member) => ({
      ...member,
      isOnline: this.chatGateway.isUserOnline(member.id),
    }));
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
