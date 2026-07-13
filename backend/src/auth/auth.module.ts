//The main decorator that turns a regular class into a NestJS module.
import { Module } from '@nestjs/common';

//The official NestJS module for working with JWT tokens.
//It provides us with the same JwtService that we injected into the constructor of our AuthService.
import { JwtModule } from '@nestjs/jwt';

//connects the Passport.js engine (the same one that controls the strategy guards) under the hood.
import { PassportModule } from '@nestjs/passport';

//these are all our hand-made files:
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

//Setting up the @Module decorator.
//All the magic happens inside the configuration object we pass to the decorator.
//It contains three main arrays: imports, controllers, and providers.
@Module({
  //this is where we put other modules we want to borrow functionality from.
  //PassportModule — we say, "We need passport functionality in this module."
  //JwtModule.register(...) — A critical setting.We're not just importing the token module; we're configuring it right away:
  //- secret: process.env.JWT_SECRET — we pass the secret key from the .env file so that JwtService knows which seal to use to sign tokens.
  //- signOptions: { expiresIn: '15m' } — we set the global default lifetime for created Access tokens (15 minutes).
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  //Here we write the gateways (endpoints) that this module exposes to the outside world.
  //We register the AuthController here so that NestJS can listen to the routes /api/auth/register, /login, and so on.
  controllers: [AuthController],
  
  //This is the real meat of DI (Dependency Injection). 
  //Here we write all the services and strategies that NestJS needs to create as a singleton and connect to each other.
  //AuthService — now NestJS knows how to inject it into the controller's constructor.
  //JwtStrategy — now NestJS launches our "turnstile guard" and connects it to the Passport engine.
  providers: [AuthService, JwtStrategy],
})

//The module class itself remains completely empty.
//In NestJS, modules are simply organizational entities; all their logic is described by the decorator at the top.
export class AuthModule {}
