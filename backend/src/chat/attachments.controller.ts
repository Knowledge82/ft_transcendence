import { Controller, Get, Param, Request, Response, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { join } from 'path';
import type { Response as ExpressResponse } from 'express';
import { ChatService } from './chat.service';
import { JwtQueryOrHeaderGuard } from './jwt-query-or-header.guard';

// Deliberately a SEPARATE controller, without a class-level JwtAuthGuard —
// this route needs to work when loaded directly by the browser (<img
// src="...">, opening a link in a new tab), which can't send our usual
// Authorization header. It uses JwtQueryOrHeaderGuard instead, which
// accepts the token from a "?token=" query parameter as a fallback.
@Controller('chat/attachments')
export class AttachmentsController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':filename')
  @UseGuards(JwtQueryOrHeaderGuard)
  async getAttachment(
    @Request() req,
    @Param('filename') filename: string,
    @Response() res: ExpressResponse,
  ) {
    const message = await this.chatService.findMessageByAttachment(filename);
    if (!message) {
      throw new NotFoundException('Attachment not found');
    }

    const allowed = await this.chatService.isParticipant(message.conversationId, req.user.userId);
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const filePath = join(process.cwd(), 'uploads', 'attachments', filename);
    res.sendFile(filePath);
  }
}
