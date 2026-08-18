import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

export interface FortyTwoProfile {
  intraId: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

// A generic OAuth2 strategy configured for 42's specific endpoints,
// rather than a niche third-party "passport-42" package — fewer
// external dependencies to trust, and this is all 42's OAuth actually
// needs: an authorization URL, a token URL, and a profile endpoint to
// call afterward with the access token it hands back.
@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'fortytwo') {
  constructor() {
    super({
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: process.env.FORTYTWO_CLIENT_ID!,
      clientSecret: process.env.FORTYTWO_CLIENT_SECRET!,
      callbackURL: process.env.FORTYTWO_CALLBACK_URL!,
      scope: 'public',
      // @types/passport-oauth2 has two overloaded option shapes — one
      // requiring passReqToCallback literally set to true, the other
      // for everything else. Without this explicit `false`, TypeScript
      // sometimes resolves to the wrong overload and complains the
      // property is "missing" even though we never wanted it.
      passReqToCallback: false,
    });
  }

  // Called by Passport once 42 has handed back an access token — we use
  // it immediately to fetch the actual profile, since that's the only
  // way to get the person's email/login/avatar out of 42's API. The
  // returned object becomes `req.user` in the callback controller method.
  async validate(accessToken: string): Promise<FortyTwoProfile> {
    const response = await fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();

    return {
      intraId: data.id,
      email: data.email,
      // 42's "login" (their intra username) is a reasonable starting
      // suggestion for a display name — the person still gets to change
      // it during the completion step if it's already taken or they'd
      // rather use something else
      displayName: data.login,
      avatarUrl: data.image?.link ?? null,
    };
  }
}
