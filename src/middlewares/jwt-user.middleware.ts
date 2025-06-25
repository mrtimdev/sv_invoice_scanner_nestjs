// src/middlewares/jwt-user.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtUserMiddleware implements NestMiddleware {
  private jwtService: JwtService;
  private configService: ConfigService;

  constructor() {
    // We'll initialize these in the configure method
  }

  use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);
    
    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        res.locals.user = payload;
      } catch (e) {
        res.locals.user = null;
      }
    }
    next();
  }

  setServices(jwtService: JwtService, configService: ConfigService) {
    this.jwtService = jwtService;
    this.configService = configService;
  }

  private extractToken(req: Request): string | null {
    return req.cookies?.jwt || 
           req.headers.authorization?.split(' ')[1] || 
           null;
  }
}