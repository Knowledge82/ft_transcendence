import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
