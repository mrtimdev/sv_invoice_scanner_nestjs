import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminMiddleware } from './admin.middleware';
import { AuthModule } from 'src/api/auth/auth.module';
import { ScansController } from './scans/scans.controller';
import { ScansModule } from './scans/scans.module';
import { ReportController } from './report/report.controller';
import { ReportModule } from './report/report.module';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';

@Module({
  imports: [AuthModule, ScansModule, ReportModule, UserModule],
  controllers: [AdminController, ScansController, ReportController, UserController],
  providers: [AdminService]
})
export class AdminModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminMiddleware)
      .forRoutes({ path: 'admin/user/login', method: RequestMethod.GET }); // Apply middleware to GET /admin/user/login
  }
}
