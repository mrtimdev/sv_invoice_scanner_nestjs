// src/common/interceptors/http.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class HttpInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((content) => {
        // If content is undefined (like in redirects), don't try to set content-type
        if (content === undefined) {
          return;
        }
        
        // If content is an object and hasn't been sent yet
        if (typeof content === 'object' && !response.headersSent) {
          response.type('application/json');
        }
        
        return content;
      }),
    );
  }
}