import { Controller, Post, Body, Headers, Res, UseGuards, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { UserThrottlerGuard } from './user-throttler.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('confess')
  @UseGuards(UserThrottlerGuard)
  async confess(
    @Body('makefile') makefile: string,
    @Headers('accept-language') language: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.aiService.streamConfession(makefile, language)) {
        res.write(chunk);
      }
      res.end();
    } catch (error) {
      console.error('Error en /ai/confess:', error);

      if (!res.headersSent) {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const body =
          error instanceof HttpException ? error.getResponse() : { statusCode: 500, message: 'Error interno' };
        res.status(status).json(body);
      } else {
        res.write('\n\n[Error: no se pudo completar la respuesta]');
        res.end();
      }
    }
  }
}
