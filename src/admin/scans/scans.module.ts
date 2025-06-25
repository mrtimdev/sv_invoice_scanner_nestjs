import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from 'src/scans/entities/scan.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Scan, User])],
    providers: [ScansService],
    exports: [ScansService],
})
export class ScansModule {}
