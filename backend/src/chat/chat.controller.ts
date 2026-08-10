import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'fs/promises';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MODERATOR_ROLES = ['GUARDIAN', 'ARZOBISPO'];

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
    this.chatGateway.joinConversationRoom(req.user.userId, conversation.id);
    this.chatGateway.joinConversationRoom(otherUserId, conversation.id);
    return conversation;
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/attachments',
        filename: (req, file, callback) => {
          const userId = (req as { user?: { userId?: number } }).user?.userId;
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          callback(null, `${userId}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Solo se permiten imágenes o archivos PDF'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return {
      filename: file.filename,
      type: file.mimetype,
      name: file.originalname,
    };
  }

  @Delete('messages/:id')
  async deleteMessage(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const message = await this.chatService.getMessageById(id);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isAuthor = message.senderId === req.user.userId;
    const role = await this.chatService.getUserRole(req.user.userId);
    const isModerator = role !== null && MODERATOR_ROLES.includes(role);

    if (!isAuthor && !isModerator) {
      throw new ForbiddenException('No puedes eliminar este mensaje');
    }

    await this.chatService.deleteMessage(id);

    if (message.attachmentFilename) {
      const filePath = join(process.cwd(), 'uploads', 'attachments', message.attachmentFilename);
      unlink(filePath).catch(() => {});
    }

    this.chatGateway.broadcastToRoom(message.conversationId, 'messageDeleted', {
      messageId: id,
      conversationId: message.conversationId,
    });

    return { deleted: true };
  }

  @Get(':conversationId/messages')
  async getHistory(
    @Request() req,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.getMessageHistory(conversationId, req.user.userId);
  }
}
