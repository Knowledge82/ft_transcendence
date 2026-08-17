import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CommunityService } from '../community/community.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARZOBISPO')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly chatGateway: ChatGateway,
    private readonly communityService: CommunityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('users')
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/role')
  async changeRole(@Param('id', ParseIntPipe) id: number, @Body('role') role: string) {
    const updated = await this.adminService.changeRole(id, role);
    this.chatGateway.notifyUser(id, 'roleChanged', { role: updated.role });

    const name = updated.displayName ?? `Usuario ${updated.id}`;
    // Both the chronicle and the personal notification now store RAW
    // role+gender — each viewer's own frontend genders it in their own
    // active language at display time.
    await this.communityService.createRoleChangedEvent(name, updated.role, updated.gender);
    await this.notificationsService.createNotification(id, 'ROLE_CHANGED', {
      role: updated.role,
      gender: updated.gender,
    });

    return updated;
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.adminService.deleteUser(id);
    const name = deleted.displayName ?? `Usuario ${deleted.id}`;
    await this.communityService.createUserExecutedEvent(name);
  }
}
