// // src/core/csrf.service.ts
// import { Injectable } from '@nestjs/common';
// import { doubleCsrf } from 'csrf-csrf';
// import { Request, Response } from 'express';

// @Injectable()
// export class CsrfService {
//   private readonly csrfProtection = doubleCsrf({
//     getSecret: () => 'your-strong-secret-key', // In production, use ConfigService
//     cookieName: '__Host-x-csrf-token',
//     cookieOptions: {
//       httpOnly: true,
//       sameSite: 'lax', // or 'strict'
//       secure: process.env.NODE_ENV === 'production',
//       path: '/',
//     },
//     size: 64,
//     ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
//   });

//   get middleware() {
//     return this.csrfProtection.doubleCsrfProtection;
//   }

//   generateToken({ req, res }: { req: Request; res: Response; }): string {
//     return this.csrfProtection.generateCsrfToken(req, res);
//   }
// }