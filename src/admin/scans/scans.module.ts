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
import { FailedJobsService } from 'src/failed-jobs/failed-jobs.service';
import { FailedJob } from 'src/entities/failed-job.entity';
import { ActiveJob } from 'src/entities/active-job.entity';
import { CompletedJob } from 'src/entities/completed-job.entity';
import { WaitingJob } from 'src/entities/waiting-job.entity';
import { DelayedJob } from 'src/entities/delayed-job.entity';
import { JobsService } from 'src/job/jobs.service';
import { JobQueueService } from 'src/job/job-queue.service';

@Module({
    imports: [TypeOrmModule.forFeature([Scan, User, Setting, FailedJob, ActiveJob, CompletedJob, WaitingJob , DelayedJob]), forwardRef(() => AdminModule), 
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
    providers: [ScansService, ProgressService, TextParserService, DocumentProcessorService, AdminService, FailedJobsService, JobQueueService ,JobsService],
    exports: [ScansService, ProgressService, DocumentProcessorService, FailedJobsService, JobQueueService,JobsService],
})
export class ScansModule {}
