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
import { AdminModule } from './admin/admin.module';
import { JwtUserMiddleware } from './middlewares/jwt-user.middleware';
import { JwtService } from '@nestjs/jwt';
import * as path from 'path';

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
  ],
  controllers: [AppController],
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




