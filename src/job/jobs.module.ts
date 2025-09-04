// src/job/jobs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { FailedJob } from '../entities/failed-job.entity';
import { ActiveJob } from '../entities/active-job.entity';
import { CompletedJob } from '../entities/completed-job.entity';
import { WaitingJob } from '../entities/waiting-job.entity';
import { DelayedJob } from '../entities/delayed-job.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            FailedJob,
            ActiveJob,
            CompletedJob,
            WaitingJob,
            DelayedJob
        ]),
    ],
    providers: [JobsService],
    exports: [JobsService], // This is crucial for making it available in other modules
})
export class JobsModule {}