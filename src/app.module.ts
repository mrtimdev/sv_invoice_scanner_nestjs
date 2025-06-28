import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './api/users/users.module';
import { ScansModule } from './api/scans/scans.module';
import { AuthModule } from './api/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Scan } from './api/scans/entities/scan.entity';
import { CustomConfigService } from './config/config.service';
import { AdminModule } from './admin/admin.module';
import { JwtUserMiddleware } from './middlewares/jwt-user.middleware';
import { JwtService } from '@nestjs/jwt';
import * as path from 'path';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './api/auth/guards/roles.guard';
import { JwtAuthGuard } from './api/auth/guards/jwt-auth.guard';
import { PermissionController } from './permission/permission.controller';
import { PermissionModule } from './permission/permission.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule, ScansModule, AuthModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<any>('DB_TYPE', 'mysql'),
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'sv_scanner_db'),
        // entities: [Scan, User],
        entities: [
            path.join(__dirname, '../dist/**/*.entity.js'),
        ],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
        autoLoadEntities: true,
        logging: configService.get<boolean>('DB_LOGGING', false)
      }),
    }),
    AdminModule,
    PermissionModule,
  ],
  controllers: [AppController, PermissionController],
  providers: [AppService, CustomConfigService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard, // First verify JWT
    // },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
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




