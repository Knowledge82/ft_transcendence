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

  // IMPORTANT: must be declared BEFORE ':conversationId/messages' — otherwise
  // "conversations" would be captured by the :conversationId param and
  // rejected by ParseIntPipe as not-a-number
  @Get('conversations/direct')
  async getDirectConversations(@Request() req) {
    const conversations = await this.chatService.getUserDirectConversations(req.user.userId);
    return conversations.map((c) => ({
      ...c,
      otherUser: c.otherUser
        ? { ...c.otherUser, isOnline: this.chatGateway.isUserOnline(c.otherUser.id) }
        : null,
    }));
  }

  @Post('dm/:userId')
  async startDirectConversation(
    @Request() req,
    @Param('userId', ParseIntPipe) otherUserId: number,
  ) {
    const conversation = await this.chatService.findOrCreateDirectConversation(
      req.user.userId,
      otherUserId,
    );
    // Make sure both people's currently-open sockets actually join the
    // room immediately — otherwise a message sent right after creating
    // this conversation wouldn't reach either of them live
    this.chatGateway.joinConversationRoom(req.user.userId, conversation.id);
    this.chatGateway.joinConversationRoom(otherUserId, conversation.id);
    return conversation;
  }

  @Get(':conversationId/messages')
  async getHistory(
    @Request() req,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.getMessageHistory(conversationId, req.user.userId);
  }
}
