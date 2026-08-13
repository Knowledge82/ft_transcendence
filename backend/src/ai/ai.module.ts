import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { UserThrottlerGuard } from './user-throttler.guard';

@Module({
  imports: [
    // 5 requests per 60 seconds per user — the LLM API call has a real
    // cost and a shared free-tier quota, so this endpoint especially
    // needs protection against accidental (or deliberate) abuse
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
  ],
  controllers: [AiController],
  providers: [AiService, UserThrottlerGuard],
  exports: [AiService],
})
export class AiModule {}
