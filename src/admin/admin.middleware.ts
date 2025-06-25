import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    console.log('AdminMiddleware is running for /admin/user/login');
    next();
  }
}
