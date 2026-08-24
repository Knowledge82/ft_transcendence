import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { CommunityModule } from '../community/community.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [CommunityModule, ChatModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
