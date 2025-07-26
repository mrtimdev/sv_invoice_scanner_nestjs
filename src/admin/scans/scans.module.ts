import { forwardRef, Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { User } from 'src/entities/user.entity';
import { ProgressService } from 'src/progress/progress.service';
import { DocumentProcessorService } from './document-processor.service';
import { AdminModule } from '../admin.module';

@Module({
    imports: [TypeOrmModule.forFeature([Scan, User]), forwardRef(() => AdminModule)],
    providers: [ScansService, ProgressService, DocumentProcessorService],
    exports: [ScansService, ProgressService, DocumentProcessorService],
})
export class ScansModule {}
