//A standard NestJS label that allows this class to be used within the ecosystem.
import { Injectable } from '@nestjs/common';

//This is a ready-made template class from the @nestjs/passport library.
//It already contains all the complex logic for intercepting an HTTP request, checking the results,
//and automatically throwing a 401 Unauthorized error.
import { AuthGuard } from '@nestjs/passport';

//extends AuthGuard('jwt') — we create our own guard, telling it: "Base it on the standard AuthGuard,
//and use the strategy named 'jwt' as the verification instruction".
//We named our strategy 'jwt' with the line extends PassportStrategy(Strategy, 'jwt'). 
//This is where the pieces come together!
//Our guard now knows to call the JwtStrategy specifically for signature and token verification.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/*🧐 Why create a separate JwtAuthGuard class if it's empty?
It would seem that there's not a single line of code inside the class, just curly braces {}. 
Why did we create an entire file for this?
This is pure professionalism and concern for code readability. In NestJS, you can protect routes with a standard guard by writing a long string like this above the controller method:

@UseGuards(AuthGuard('jwt'))

But writing 'jwt' as a string everywhere is bad form (you could make a typo, writing jtw,
and the protection would silently break).
By creating the JwtAuthGuard class, she created a beautiful, strict template.
Now, in any project controller (chats, matches, profiles), you can set guards on endpoints
in an incredibly aesthetically pleasing way:

@Get('my-profile')
@UseGuards(JwtAuthGuard) // <- Pure joy, no "magic strings" in parentheses!
getProfile() {
return 'Welcome to your profile!';
}

*/
