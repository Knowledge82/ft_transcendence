import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { ChatGateway } from '../chat/chat.gateway';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  async listFriends(@Request() req) {
    const friends = await this.friendsService.listFriends(req.user.userId);
    return friends.map((friend) => ({
      ...friend,
      isOnline: this.chatGateway.isUserOnline(friend.id),
    }));
  }

  @Get('requests')
  async listPendingRequests(@Request() req) {
    return this.friendsService.listPendingRequests(req.user.userId);
  }

  @Post('request/:userId')
  async sendRequest(
    @Request() req,
    @Param('userId', ParseIntPipe) addresseeId: number,
  ) {
    return this.friendsService.sendRequest(req.user.userId, addresseeId);
  }

  @Post(':userId/accept')
  async acceptRequest(
    @Request() req,
    @Param('userId', ParseIntPipe) requesterId: number,
  ) {
    return this.friendsService.acceptRequest(req.user.userId, requesterId);
  }

  @Delete(':userId')
  async removeFriendship(
    @Request() req,
    @Param('userId', ParseIntPipe) otherUserId: number,
  ) {
    await this.friendsService.removeFriendship(req.user.userId, otherUserId);
  }
}
