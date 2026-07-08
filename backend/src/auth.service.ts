// 1. IMPORTS
import {
  Injectable, // special label for NestJS: "this class is a constructor detail.
              // It can be automatically injected into other files."
  ConflictException, // ready-made blank for 409
  UnauthorizedException, //ready-made blank for 401
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';//NestJS's built-in tool for creating and signing Access tokens
import * as bcrypt from 'bcrypt';//A library that can permanently encrypt (hash) passwords.
                                //There's no way back: it's impossible to recover a password from a hash
import * as crypto from 'crypto';//A standard Node.js module for generating random secure strings.
import { PrismaService } from '../prisma/prisma.service';//import our own files: the database service (PrismaService)
import { RegisterDto } from './dto/register.dto'; // and the same data validation "passports"
import { LoginDto } from './dto/login.dto';

// 2. CONSTS
const SALT_ROUNDS = 12; // Password encryption difficulty. The higher the number, the harder the computer will work to create the hash. 12 is the sweet spot, preventing hackers from brute-forcing the password
const ACCESS_TOKEN_TTL = '15m'; // The short token will live for exactly 15 minutes.
const REFRESH_TOKEN_TTL_DAYS = 7; // A long token in the database will live for 7 days.

// 3. CONSTRUCTOR (DEPENDENCY INJECTION)
@Injectable()
export class AuthService { // declare the AuthService class
  constructor(
    private readonly prisma: PrismaService, // need a database
    private readonly jwtService: JwtService, // and token generator
  ) {} //NestJS finds them and makes them available through this.prisma and this.jwtService

// 4. REGISTER METHOD
  async register(dto: RegisterDto) { // async/await - the database operation takes time,
    // and the server will politely wait for a response from Postgres without hanging.
    const existingUser = await this.prisma.user.findUnique({//We go into the user table and look for a record whose email matches the one entered by the user in the form (dto.email)
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);//If everything is clear, we take the clear password from the form (dto.password), feed it to the bcrypt library, add a complexity of 12, and get complete gibberish as the output - passwordHash.

    //We give Prisma the command: "Create a new row in the User table."
    //We enter the email address, our newly generated password hash, and our nickname.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    //The user has been created successfully! Now we call a special internal method,
    //this.issueTokens (we'll discuss it later), which will create access keys (tokens) for the user
    //and return them.
    return this.issueTokens(user.id, user.email);
  }

// 5. LOGIN METHOD
  //The user is trying to log in. First, we go back into the database and
  //search for the user by the email they sent.
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Mensaje de error idéntico tanto si el email no existe como si la
    // contraseña es incorrecta: así no revelamos qué emails están registrados
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    //Since the database contains a hash, we can't simply write dto.password == user.passwordHash
    //We call the bcrypt.compare function. It takes the clear password from the form,
    //hashes it using the same algorithm, and compares it with the hash in the database.
    //If they don't match (!passwordMatches), we throw the same error.
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    //If the email address is found and the password is correct, we generate and return fresh tokens.
    //The user has successfully logged in!
    return this.issueTokens(user.id, user.email);
  }

// 6. REFRESH METHOD (Session Extension)
  // This method is called automatically from the frontend when the user's Access token expires
  // within 15 minutes, so that they are not kicked out of the site.
  async refresh(rawToken: string) { //The frontend sends us an old long refresh token (rawToken)
    //We look up this token in the refreshToken table in the database.
    //The include: { user: true } command is a "join." It tells Prisma,
    //"Don't just find the token, but also immediately append the user data to the result."
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });

    // a strict check. reject on: token doesn't exist in the DB or
    // token is already marked as revoked or
    // the token has expired (is older than 7 days)
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    //If the token passes verification, we immediately burn it. 
    //We update this row in the database, setting the revoked: true flag.
    //No one will ever be able to use it again.
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });
  
    //And we immediately generate a completely new, clean pair of tokens for the user
    //to replace the burned one.
    return this.issueTokens(storedToken.user.id, storedToken.user.email);
  }

// LOGOUT METHOD
  // The user clicked the "Logout" button. The frontend sends their current refresh token.
  // We find it in the database and turn it into a pumpkin (data: { revoked: true }).
  // Now, even if a hacker steals this token from the user's computer,
  // they won't be able to access the website using it. The session is closed.
  async logout(rawToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: rawToken },
      data: { revoked: true },
    });
  }

// 8. Internal method issueTokens (TOKEN FACTORY)
  // This is a working tool that is called inside register, login and refresh to avoid duplicating
  // the key generation code.
  private async issueTokens(userId: number, email: string) {
    //Payload is the "payload" that will be embedded directly into the short Access Token.
    //We include the user ID (in the JWT standard, this field is called the sub-subject)
    //and their email address.
    const payload = { sub: userId, email };

    //We call the generator, passing it the payload, the secret signature from the .env file(JWT_SECRET)
    //and the lifetime (15 minutes).
    //The output is a long encoded string—the Access Token. The frontend will store it in memory.
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: ACCESS_TOKEN_TTL,
    });

    //Now let's create a long token. Using the crypto module, we generate a completely random set
    //of 64 bytes of code and convert it to a regular string (hex).
    //The result will be something like a8f9c2.... This is our Refresh Token.
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    
    //We calculate the death date for this refresh token by taking the current time (new Date())
    //and adding 7 days to it.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    // We save this random refresh token, the user ID, and the date of death
    // in the refreshToken database table so that the backend remembers it.
    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt,
      },
    });

    // And finally, we return this sweet couple (accessToken and refreshToken) to the outside,
    // so that the controller and then the frontend receive them.
    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }
}
