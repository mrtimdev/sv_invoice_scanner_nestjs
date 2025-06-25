// src/auth/guards/redirect-if-authenticated.guard.ts
import { Injectable, CanActivate, ExecutionContext, Redirect } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedirectIfAuthenticatedGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const token = request.cookies?.jwt;
    
    if (token) {
      try {
        const user = await this.authService.validateToken(token);
        if (user) {
          response.redirect('/admin/dashboard');
          return false;
        }
      } catch (e) {
      }
    }
    
    return true;
  }
}