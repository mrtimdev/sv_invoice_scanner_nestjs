import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { ReportController } from './report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Scan])],
  providers: [ReportService],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportModule {}
