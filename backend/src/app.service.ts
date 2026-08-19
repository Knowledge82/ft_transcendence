import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Replaces NestJS's default "Hello World!" placeholder — this is the
  // root of the API (/api/), not a page a person browses to, so a small
  // identifying JSON payload is more appropriate than any HTML content
  getApiInfo() {
    return {
      name: 'La Iglesia del Verdadero Relink API',
      status: 'online',
      version: '1.0.0',
    };
  }
}
