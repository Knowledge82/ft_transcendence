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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

const ALLOWED_BANNER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024;

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

  @Post(':id/banner')
  @UseInterceptors(
    FileInterceptor('banner', {
      storage: diskStorage({
        destination: './uploads/organization-banners',
        filename: (req, file, callback) => {
          const orgId = req.params.id;
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          callback(null, `${orgId}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: MAX_BANNER_SIZE_BYTES },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_BANNER_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException('Only JPEG, PNG or WEBP images are allowed'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadBanner(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const bannerUrl = `/api/uploads/organization-banners/${file.filename}`;
    return this.organizationsService.updateOrganization(id, { bannerUrl }, req.user.userId);
  }

  @Delete(':id/banner')
  async removeBanner(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.updateOrganization(
      id,
      { bannerUrl: null },
      req.user.userId,
    );
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
