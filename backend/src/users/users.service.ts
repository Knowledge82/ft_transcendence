import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

//Registers the service in the NestJS DI container.
//It can now be injected into other controllers or modules.
@Injectable()
export class UsersService {
  //private readonly prisma: PrismaService — we request NestJS access to our global database module. 
  //Through this.prisma , we gain full access to all tables.
  constructor(private readonly prisma: PrismaService) {}

  // Safe selection via select
  // findUnique({ where: { id: userId } }) — Prizma executes the fastest SQL query SELECT ... WHERE id = $1, using a unique index on id.
  // select: { ... } — The golden rule of security. By default, Prizma scrapes all table fields from the database, including passwordHash. If a developer accidentally returns such an object to a client, the password hash will leak to the frontend (a huge security hole!).
  // Using the select object, we firmly instructed the database: "Return me only the id, email, name, avatar, and creation date. Don't even retrieve the passwordHash field from the database." This guarantees that the password hash will never leak, even if you forget to filter the response somewhere.
  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // Never return passwordHash to the client, not even by mistake
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    //If there's no user with that ID in the database (for example, the token is old and the user has already been manually deleted), Prizma will return null.
    //The throw new NotFoundException(...) line intercepts this and throws a standard NestJS exception. On the client, this will automatically be converted into a nice response with a 404 Not Found status and the error text.
    if (!user) {
      throw new NotFoundException('User not found');
    }

    //If the user is found, the method simply returns this clean, filtered object.
    return user;
  }
}
