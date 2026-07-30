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
    const friendship = await this.friendsService.sendRequest(req.user.userId, addresseeId);
    this.chatGateway.notifyUser(addresseeId, 'friendRequestReceived', friendship);
    return friendship;
  }

  @Post(':userId/accept')
  async acceptRequest(
    @Request() req,
    @Param('userId', ParseIntPipe) requesterId: number,
  ) {
    const friendship = await this.friendsService.acceptRequest(req.user.userId, requesterId);
    // Notify the original requester too — otherwise their friends list
    // only shows the new friend after a manual reload
    const accepter = await this.friendsService.getBasicInfo(req.user.userId);
    this.chatGateway.notifyUser(requesterId, 'friendRequestAccepted', accepter);
    return friendship;
  }

  @Delete(':userId')
  async removeFriendship(
    @Request() req,
    @Param('userId', ParseIntPipe) otherUserId: number,
  ) {
    await this.friendsService.removeFriendship(req.user.userId, otherUserId);
  }
}
