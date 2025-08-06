// src/auth/guards/authenticated.guard.ts
import { Injectable, CanActivate, ExecutionContext, Redirect } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request_ = context.switchToHttp().getRequest<Request>();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const token = request.cookies?.jwt;
    if (token) {
      try {
        const user = await this.authService.validateToken(token);
        if (user) {
           
          return true;
        }
      } catch (e) {
        // Token is invalid
      }
    }
    response.redirect('/admin/user/login');
    // If not authenticated, you could redirect here
    // But for guards used on login page, we want the opposite behavior
    return false;
  }
}