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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARZOBISPO')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('users')
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/role')
  async changeRole(@Param('id', ParseIntPipe) id: number, @Body('role') role: string) {
    const updated = await this.adminService.changeRole(id, role);
    // Tell that specific user's live sockets their role just changed, so
    // the UI can update instantly instead of waiting for a page reload —
    // the actual permission check was already live all along (RolesGuard
    // re-reads the role from the database on every request), this is
    // purely about what's displayed on screen
    this.chatGateway.notifyUser(id, 'roleChanged', { role: updated.role });
    return updated;
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteUser(id);
  }
}
