import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { Scan } from './entities/scan.entity';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/api/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Scan, User])],
  controllers: [ScansController],
  providers: [ScansService]
})
export class ScansModule {}
