import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { Scan } from './entities/scan.entity';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/api/users/users.module';
import { TextParserService } from './text-parser.service';
import { AdminService } from 'src/admin/admin.service';
import { Setting } from 'src/entities/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Scan, User, Setting])],
  controllers: [ScansController],
  providers: [ScansService, TextParserService, AdminService]
})
export class ScansModule {}
