import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChatModule } from '../chat/chat.module';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [ChatModule, CommunityModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
