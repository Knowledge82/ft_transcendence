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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARZOBISPO')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly chatGateway: ChatGateway,
    private readonly communityService: CommunityService,
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
    await this.communityService.createEvent(
      'ROLE_CHANGED',
      `${name} ha alcanzado el rango de ${updated.role}.`,
    );

    return updated;
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteUser(id);
  }
}
