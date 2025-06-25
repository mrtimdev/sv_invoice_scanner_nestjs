import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ScansModule } from './scans/scans.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Scan } from './scans/entities/scan.entity';
import { CustomConfigService } from './config/config.service';
import { ViewsController } from './views/views.controller';
import { AdminModule } from './admin/admin.module';
import { JwtUserMiddleware } from './middlewares/jwt-user.middleware';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule, ScansModule, AuthModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'sv_scanner_db',
      entities: [Scan, User],
      synchronize: true,
      autoLoadEntities: true,
      logging: false
    }),
    AdminModule,
  ],
  controllers: [AppController, ViewsController],
  providers: [AppService, CustomConfigService],
})
export class AppModule {
  // constructor(private dataSource: DataSource) {}

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    const middleware = new JwtUserMiddleware();
    middleware.setServices(this.jwtService, this.configService);
    consumer
      .apply(middleware.use.bind(middleware))
      .forRoutes('*');
  }
}




