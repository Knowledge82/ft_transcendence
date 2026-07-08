import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Envolvemos PrismaClient en un servicio inyectable para poder usarlo
// en cualquier módulo mediante Dependency Injection, en lugar de crear
// una instancia nueva en cada archivo
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Conectamos explícitamente cuando arranca el módulo
  async onModuleInit() {
    await this.$connect();
  }

  // Cerramos la conexión limpiamente cuando la aplicación se apaga
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
