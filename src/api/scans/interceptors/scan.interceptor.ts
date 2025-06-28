// scans/interceptors/scan.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ScanResponseDto } from '../dto/scan-response.dto';

@Injectable()
export class ScanInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        if (Array.isArray(data)) {
          return data.map(item => new ScanResponseDto(item));
        }
        return new ScanResponseDto(data);
      }),
    );
  }
}