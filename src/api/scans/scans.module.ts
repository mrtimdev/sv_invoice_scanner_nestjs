import { forwardRef, Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { Scan } from './entities/scan.entity';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/api/users/users.module';
import { TextParserService } from './text-parser.service';
import { AdminService } from 'src/admin/admin.service';
import { Setting } from 'src/entities/setting.entity';
import { BullModule } from '@nestjs/bull';
import { ScanProcessor } from 'src/config/scan.processor';
import { DocumentProcessorService } from 'src/admin/scans/document-processor.service';

@Module({
  imports: [
    
    TypeOrmModule.forFeature([Scan, User, Setting]),
    // BullModule.registerQueue({
    //   name: 'image_processing', // This must match exactly
    // }),
    BullModule.registerQueue({
      name: 'scan',
    }),
  ],
  controllers: [ScansController],
  providers: [ScansService, TextParserService, AdminService, ScanProcessor, DocumentProcessorService],
  // exports: [ScansService],
})
export class ScansModule {}
