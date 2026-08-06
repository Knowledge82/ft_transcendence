import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { ChatModule } from '../chat/chat.module';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [ChatModule, CommunityModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
