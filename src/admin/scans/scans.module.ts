import { forwardRef, Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { User } from 'src/entities/user.entity';
import { ProgressService } from 'src/progress/progress.service';
import { DocumentProcessorService } from './document-processor.service';
import { AdminModule } from '../admin.module';
import { BullModule } from '@nestjs/bull';
import { AdminService } from '../admin.service';
import { Setting } from 'src/entities/setting.entity';
import { TextParserService } from 'src/api/scans/text-parser.service';

@Module({
    imports: [TypeOrmModule.forFeature([Scan, User, Setting]), forwardRef(() => AdminModule), 
        // BullModule.registerQueue({
        //     name: 'scan',
        // }),
    ],
    providers: [ScansService, ProgressService, TextParserService, DocumentProcessorService, AdminService],
    exports: [ScansService, ProgressService, DocumentProcessorService],
})
export class ScansModule {}
