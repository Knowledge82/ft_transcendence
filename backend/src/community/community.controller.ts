import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  async getFeed() {
    return this.communityService.getRecentEvents();
  }

  @Get('feed/today')
  async getTodayFeed() {
    return this.communityService.getTodayEvents();
  }
}
