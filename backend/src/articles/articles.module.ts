import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { AiModule } from '../ai/ai.module';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [AiModule, CommunityModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
