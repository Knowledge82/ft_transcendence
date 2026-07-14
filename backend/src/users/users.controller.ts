import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    // JwtAuthGuard runs JwtStrategy.validate() before this method executes.
    // Whatever validate() returned is injected here as req.user
    // (in our case: { userId, email }, set in jwt.strategy.ts)
    return this.usersService.findById(req.user.userId);
  }
}
