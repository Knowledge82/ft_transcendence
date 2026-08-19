import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list() {
    return this.organizationsService.listOrganizations();
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.getOrganizationById(id);
  }

  @Post()
  async create(@Request() req, @Body('name') name: string, @Body('color') color: string) {
    return this.organizationsService.createOrganization(name, color, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name?: string; manifesto?: string; color?: string },
  ) {
    return this.organizationsService.updateOrganization(id, data, req.user.userId);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    await this.organizationsService.deleteOrganization(id, req.user.userId);
  }

  @Post(':id/join')
  async join(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.joinOrganization(id, req.user.userId);
  }

  @Post('leave')
  async leave(@Request() req) {
    await this.organizationsService.leaveOrganization(req.user.userId);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.organizationsService.removeMember(id, userId, req.user.userId);
  }
}
