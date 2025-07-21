import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { User } from 'src/entities/user.entity';
import { ProgressService } from 'src/progress/progress.service';

@Module({
    imports: [TypeOrmModule.forFeature([Scan, User])],
    providers: [ScansService, ProgressService],
    exports: [ScansService, ProgressService],
})
export class ScansModule {}
