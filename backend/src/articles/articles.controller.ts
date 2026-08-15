import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Headers,
  Request,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { AiService } from '../ai/ai.service';
import { CommunityService } from '../community/community.service';

const DEFAULT_RANDOM_COUNT = 3;

@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly aiService: AiService,
    private readonly communityService: CommunityService,
  ) {}

  @Get()
  async getAll() {
    return this.articlesService.getAllArticles();
  }

  // Declared BEFORE ':id' — otherwise "random" would be captured by the
  // :id parameter and rejected by ParseIntPipe, same ordering rule we've
  // hit before with other controllers
  @Get('random')
  async getRandom(@Query('count') count?: string) {
    const parsed = count ? parseInt(count, 10) : DEFAULT_RANDOM_COUNT;
    return this.articlesService.getRandomArticles(parsed || DEFAULT_RANDOM_COUNT);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.getArticleById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INQUISIDOR', 'ARZOBISPO')
  async create(
    @Request() req,
    @Body() dto: CreateArticleDto,
    @Headers('accept-language') language: string,
  ) {
    // The AI check happens BEFORE anything is saved — a rejected article
    // never touches the database at all, only the stern rejection
    // message is sent back
    const check = await this.aiService.checkArticleRelevance(dto.title, dto.content, language);
    if (!check.approved) {
      throw new BadRequestException(check.rejectionMessage);
    }

    const article = await this.articlesService.createArticle(
      req.user.userId,
      dto.title,
      dto.content,
    );

    const authorName = article.author.displayName ?? `Usuario ${article.author.id}`;
    await this.communityService.createArticlePublishedEvent(authorName, article.title);

    return article;
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateArticleDto,
    @Headers('accept-language') language: string,
  ) {
    const existing = await this.articlesService.getArticleById(id);
    const isAuthor = existing.authorId === req.user.userId;
    const requesterRole = await this.articlesService.getUserRole(req.user.userId);
    const isArzobispo = requesterRole === 'ARZOBISPO';

    if (!isAuthor && !isArzobispo) {
      throw new ForbiddenException('Solo el autor o un Arzobispo pueden corregir este tratado');
    }

    // Editing is treated as "republishing" — the content changed, so it
    // goes through the same relevance check again before being saved
    const check = await this.aiService.checkArticleRelevance(dto.title, dto.content, language);
    if (!check.approved) {
      throw new BadRequestException(check.rejectionMessage);
    }

    const updated = await this.articlesService.updateArticle(id, dto.title, dto.content);

    const editor = await this.articlesService.getUserBasicInfo(req.user.userId);
    const editorName = editor?.displayName ?? `Usuario ${req.user.userId}`;
    await this.communityService.createArticleEditedEvent(editorName, updated.title);

    return updated;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ARZOBISPO')
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const deleted = await this.articlesService.deleteArticle(id);

    const deleter = await this.articlesService.getUserBasicInfo(req.user.userId);
    const deleterName = deleter?.displayName ?? `Usuario ${req.user.userId}`;
    await this.communityService.createArticleDeletedEvent(deleterName, deleted.title);

    return { deleted: true };
  }
}
