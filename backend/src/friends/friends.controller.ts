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
import { CommunityService } from '../community/community.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly chatGateway: ChatGateway,
    private readonly communityService: CommunityService,
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
    const accepter = await this.friendsService.getBasicInfo(req.user.userId);
    this.chatGateway.notifyUser(requesterId, 'friendRequestAccepted', accepter);

    const requester = await this.friendsService.getBasicInfo(requesterId);
    const accepterName = accepter?.displayName ?? `Usuario ${accepter?.id}`;
    const requesterName = requester?.displayName ?? `Usuario ${requester?.id}`;
    await this.communityService.createEvent(
      'FRIENDSHIP_ACCEPTED',
      `${requesterName} y ${accepterName} han jurado hermandad ante el Verdadero Relink.`,
    );

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
