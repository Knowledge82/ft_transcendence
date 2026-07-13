// NestJS's tools for working with HTTP requests:
// - Controller is a decorator that tells NestJS, "This class will listen for specific addresses (URLs) in the browser."
// - Post indicates that we're listening for POST requests (when the client sends data to the server, such as a form).
// - Body is a tool that can extract data from the body of an HTTP request (a JSON packet) and pass it to our code.
// - HttpCode and HttpStatus are settings for managing server response status codes (so that the server returns nice 200 OK or 204 No Content instead of the standard ones).
import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

// our service with logic (AuthService) and "passports" for data verification (RegisterDto, LoginDto).
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Main Class Decorator
// - @Controller('auth') — this line sets the base address (prefix) for the entire file. Since our Nginx proxy requests from /api/, this controller will be responsible for everything that goes to https://localhost:8443/api/auth/....
// - export class AuthController — we create the controller class itself, making it available to the NestJS builder.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {} //Dependency Injection. We're telling NestJS
  // "Hey, the controller can't hash passwords or access the database. Give it AuthService to help."
  // NestJS takes the created service instance and stores it in the this.authService variable.

  // Registration
  @Post('register') // is concatenated with the class's base URL. This method will only work if the frontend sends a POST request to /api/auth/register.
  async register(@Body() dto: RegisterDto) { //JSON is extracted from the incoming request. 
    //It is forced through the validation pipeline, checking against the RegisterDto rules (email, password length).
    //If the data is dirty, the pipeline will immediately throw a 400 Bad Request error, and the code below won't even run. If the data is clean, it is carefully packed into the dto variable.
    return this.authService.register(dto); // we simply forward this clean data to our "brains" service
    // The server will check the email for uniqueness, hash the password, create a user, and return an array of tokens to the frontend.
  }

  @Post('login') //listens to the address /api/auth/login.
  @HttpCode(HttpStatus.OK) //Since this is a POST request, NestJS would return a 201 Created status
  // by default. But during login, we don't create anything new in the database;
  // we simply check permissions. So we override status with classic 200 OK via HttpStatus.OK
  async login(@Body() dto: LoginDto) { //fetches the JSON and validates it against the login ID (we don't care about the nickname, only the email and password).
    return this.authService.login(dto); // Passes the data to this.authService.login(dto), which verifies the hashes and issues tokens.
  }

  //Token update
  @Post('refresh') // listens to the address /api/auth/refresh. When the frontend's 15-minute Access Token expires, it knocks here.
  @HttpCode(HttpStatus.OK) // return a 200 OK status.
  async refresh(@Body('refreshToken') refreshToken: string) { // Notice the parentheses! Here, the string 'refreshToken' is passed to the @Body decorator. 
    // This means, "I don't need the entire JSON object sent. 
    // Extract only one specific field from this JSON with the key "refreshToken" and ignore everything else."
    // And write this string to the refreshToken variable.
    return this.authService.refresh(refreshToken); // We send this string to this.authService.refresh(refreshToken), where the token is burned, and the user receives a new key pair.
  }

  @Post('logout') // listens to /api/auth/logout
  @HttpCode(HttpStatus.NO_CONTENT) // Status 204 No Content means: “Everything went well, but the server has nothing to return to you in response.” 
  // When logging out, we really don’t need to send any data to the client, we just cleared the database on the backend. 
  // The frontend will see status 204 and understand that the session is closed.
  async logout(@Body('refreshToken') refreshToken: string) { //again we extract only the refresh token itself from the request body.
    await this.authService.logout(refreshToken); // marks the token as revoked. The method does not return anything (void), so the controller simply silently closes the request with status 204.
  }
}
