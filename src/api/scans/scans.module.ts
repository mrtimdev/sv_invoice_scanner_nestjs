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
import { FailedJobsService } from 'src/failed-jobs/failed-jobs.service';
import { FailedJob } from 'src/entities/failed-job.entity';
import { JobsService } from 'src/job/jobs.service';
import { DelayedJob } from 'src/entities/delayed-job.entity';
import { CompletedJob } from 'src/entities/completed-job.entity';
import { ActiveJob } from 'src/entities/active-job.entity';
import { WaitingJob } from 'src/entities/waiting-job.entity';

@Module({
  imports: [
    
    TypeOrmModule.forFeature([Scan, User, Setting, FailedJob, ActiveJob, CompletedJob, WaitingJob , DelayedJob ]),
    // BullModule.registerQueue({
    //   name: 'image_processing', // This must match exactly
    // }),
    BullModule.registerQueue({
      name: 'scan',
      settings: {
        stalledInterval: 0, // 30 seconds (default is 30s)
        maxStalledCount: 0,     // How many times to retry stalled jobs
        guardInterval: 5000,    // How often to check for stalled jobs
      },
      defaultJobOptions: {
        attempts: 0,           // Number of retries
        backoff: {
          type: 'exponential', // Exponential backoff
          delay: 1000          // Initial delay in ms
        },
        removeOnComplete: false, // Whether to remove on success
        removeOnFail: false     // Keep failed jobs for analysis
      }
    }),
  ],
  controllers: [ScansController],
  providers: [ScansService, TextParserService, AdminService, ScanProcessor, DocumentProcessorService, FailedJobsService,
    JobsService
  ],
  exports: [JobsService],
})
export class ScansModule {}
