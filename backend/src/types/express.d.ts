// This augments the global Express namespace so that anywhere in the app,
// `req.user` is typed as having `userId` and `email` — matching exactly
// what JwtStrategy.validate() returns and attaches to the request.
declare global {
  namespace Express {
    interface User {
      userId: number;
      email: string;
    }
  }
}

export {};
