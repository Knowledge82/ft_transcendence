import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChatGateway } from '../chat/chat.gateway';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('me')
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  async updateMe(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, callback) => {
          const userId = req.user?.userId;
          if (!userId) {
            callback(new Error('Unauthenticated upload attempt'), '');
            return;
          }
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          callback(null, `${userId}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Only JPEG, PNG or WEBP images are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const avatarUrl = `/api/uploads/avatars/${file.filename}`;
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  // IMPORTANT: this route must stay declared AFTER 'me' and 'me/avatar' —
  // otherwise a request to /users/me could be captured by :id first
  @Get(':id')
  async getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    const profile = await this.usersService.findPublicProfile(id);
    return {
      ...profile,
      isOnline: this.chatGateway.isUserOnline(profile.id),
    };
  }
}
