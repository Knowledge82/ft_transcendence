//Module - is a system decorator that turns this class into a Root Module. 
//Any NestJS application must have at least one such main module, which NestJS begins reading the entire project from when Docker starts
import { Module } from '@nestjs/common';

//AppController and AppService are the default files that are created automatically when the project is generated (usually they just return the line "Hello World!" on the main page).
import { AppController } from './app.controller';
import { AppService } from './app.service';

//We're importing our two powerful independent modules, which we've been assembling piece by piece.
//We're extracting them from their folders to connect them to the main system shield.
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

//Setting up the @Module decorator (Building a dependency tree)
//In NestJS, the architecture is built like a tree.
//There's one root (AppModule), and branches (other modules) grow from it in all directions.
@Module({
  //imports is an array where we connect other standalone modules.
  //What's going on under the hood here: When NestJS runs inside a Docker container, it goes into this array and sees:
  //1) PrismaModule: NestJS goes there, sees the @Global() decorator, starts PrismaService, opens one pure connection to Postgres and makes it available to the entire application.
  //2) AuthModule: NestJS goes into it, sees the token settings (15 minutes of life, secret key), registers registration/login endpoints and runs security strategies.
  imports: [PrismaModule, AuthModule],

  //controllers and providers — the standard core application files remain here (AppController for top-level routes and AppService for their logic).
  //export class AppModule {} — the root class itself, which NestJS will pick up in the main.ts file when starting the server.
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
