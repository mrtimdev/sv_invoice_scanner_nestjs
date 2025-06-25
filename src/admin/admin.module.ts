import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminMiddleware } from './admin.middleware';
import { AuthModule } from 'src/auth/auth.module';
import { ScansController } from './scans/scans.controller';
import { ScansModule } from './scans/scans.module';

@Module({
  imports: [AuthModule, ScansModule],
  controllers: [AdminController, ScansController],
  providers: [AdminService]
})
export class AdminModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminMiddleware)
      .forRoutes({ path: 'admin/user/login', method: RequestMethod.GET }); // Apply middleware to GET /admin/user/login
  }
}
