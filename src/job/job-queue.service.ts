// job-queue.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { JobsService } from './jobs.service';
import path from 'path';
import { JobStatus } from 'src/enums/job.types';
import { User } from 'src/entities/user.entity';

@Injectable()
export class JobQueueService {
    constructor(
        @InjectQueue('scan') private readonly scanQueue: Queue,
        private readonly jobsService: JobsService,
    ) {}

    // Add a new job to the queue
    async addImageProcessingJob(
        jobData: {
            imagePath: string;
            userId?: number;
            user?: any;
            // other job-specific data
        },
        jobOptions: {
            priority?: number;
            delay?: number;
            attempts?: number;
            backoff?: number | { type: 'exponential'; delay: number };
            timeout?: number;
        } = {}
    ): Promise<Job> {
        const { priority, delay, attempts, backoff, timeout } = jobOptions;

        const job = await this.scanQueue.add(
            'process_and_create_scan', // job name
            jobData,
            {
                priority: priority || 1,
                delay,
                attempts: attempts || 3,
                backoff: backoff || { type: 'exponential', delay: 5000 },
                timeout: timeout || 30000,
                removeOnComplete: true, // remove from queue when completed
                removeOnFail: false, // keep in queue when failed for monitoring
            }
        );

        // Store as waiting job in database
        await this.jobsService.createWaitingJob(
            job.id.toString(),
            'process_and_create_scan',
            jobData.imagePath ? path.basename(jobData.imagePath) : 'unknown',
            jobData,
            jobData.userId,
            priority
        );

        console.log(`Job ${job.id} added to queue with status: ${await job.getState()}`);
        return job;
    }

    // Add a delayed job
    async addDelayedImageJob(
        jobData: any,
        delayUntil: Date,
        delayReason: string
    ): Promise<Job> {
        const delayMs = delayUntil.getTime() - Date.now();
        
        const job = await this.scanQueue.add(
            'process_and_create_scan',
            jobData,
            {
                delay: delayMs > 0 ? delayMs : 0,
                attempts: 3,
                removeOnComplete: true,
            }
        );

        // Store as delayed job in database
        await this.jobsService.createDelayedJob(
            job.id.toString(),
            'process_and_create_scan',
            jobData.imagePath ? path.basename(jobData.imagePath) : 'unknown',
            jobData,
            delayUntil,
            delayReason,
            jobData.userId
        );

        return job;
    }

    // Add multiple jobs in bulk
    async addBulkJobs(jobsData: Array<{ data: any; options?: any }>): Promise<Job[]> {
        const jobs = await this.scanQueue.addBulk(
            jobsData.map(job => ({
                name: 'process_and_create_scan',
                data: job.data,
                opts: {
                    priority: job.options?.priority || 1,
                    attempts: job.options?.attempts || 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    ...job.options,
                },
            }))
        );

        // Store all as waiting jobs
        for (const job of jobs) {
            await this.jobsService.createWaitingJob(
                job.id.toString(),
                'process_and_create_scan',
                job.data.imagePath ? path.basename(job.data.imagePath) : 'unknown',
                job.data,
                job.data.userId,
                job.opts.priority
            );
        }

        return jobs;
    }

    // Get job by ID
    async getJob(jobId: string): Promise<Job | null> {
        return this.scanQueue.getJob(jobId);
    }

    // Get job state
    async getJobState(jobId: string): Promise<string> {
        const job = await this.getJob(jobId);
        return job ? job.getState() : 'unknown';
    }

    // Retry failed job
    async retryJob(jobId: string): Promise<void> {
        const job = await this.getJob(jobId);
        if (job) {
            await job.retry();
            await this.jobsService.incrementRetryCount(jobId);
        }
    }

    // Remove job from queue
    async removeJob(jobId: string): Promise<void> {
        const job = await this.getJob(jobId);
        if (job) {
            await job.remove();
            
            // Also remove from our database tracking
            const state = await job.getState();
            await this.jobsService.deleteJob(jobId, state as JobStatus);
        }
    }

    // Get all jobs from queue with states
    async getAllQueueJobs(): Promise<{ [state: string]: Job[] }> {
        const states = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];
        const jobsByState: { [state: string]: Job[] } = {};

        for (const state of states) {
            jobsByState[state] = await this.scanQueue.getJobs([state as any], 0, -1);
        }

        return jobsByState;
    }

    // Clean old completed jobs
    async cleanOldJobs(ageInHours: number = 24): Promise<void> {
        const states = ['completed', 'failed'] as const;
        const cutoffTime = Date.now() - (ageInHours * 60 * 60 * 1000);

        for (const state of states) {
            const jobs = await this.scanQueue.getJobs([state], 0, -1);
            for (const job of jobs) {
                const jobTimestamp = job.processedOn || job.finishedOn || job.timestamp;
                if (jobTimestamp && jobTimestamp < cutoffTime) {
                    await job.remove();
                }
            }
        }
    }

    async removeAllFailedJobs(): Promise<{
        queueRemoved: number;
        databaseRemoved: number;
        totalRemoved: number;
    }> {
        let queueRemoved = 0;
        let databaseRemoved = 0;

        try {
            // 1. Remove failed jobs from Bull queue
            const failedJobs = await this.scanQueue.getJobs(['failed'], 0, -1);
            
            for (const job of failedJobs) {
                try {
                    await job.remove();
                    queueRemoved++;
                    console.log(`Removed failed job ${job.id} from queue`);
                } catch (error) {
                    console.error(`Failed to remove job ${job.id} from queue:`, error.message);
                }
            }

            // 2. Remove failed jobs from database
            const failedJobsInDb = await this.jobsService.getJobsByStatus('failed');
            databaseRemoved = failedJobsInDb.length;

            for (const job of failedJobsInDb) {
                try {
                    await this.jobsService.deleteJob(job.jobId, 'failed');
                    console.log(`Removed failed job ${job.jobId} from database`);
                } catch (error) {
                    console.error(`Failed to remove job ${job.jobId} from database:`, error.message);
                }
            }

            return {
                queueRemoved,
                databaseRemoved,
                totalRemoved: queueRemoved + databaseRemoved
            };

        } catch (error) {
            console.error('Error removing all failed jobs:', error.message);
            throw new Error(`Failed to remove all failed jobs: ${error.message}`);
        }
    }



    // retry actived job

    async retryActivedFailedJob(jobId: string, user: User): Promise<{ success: boolean; message: string; newJobId?: string }> {
        const activedJob = await this.jobsService.findActiveJobByJobId(jobId);

        if (!activedJob) {
            throw new NotFoundException(`Actived job with ID ${jobId} not found`);
        }

        // Check if job has been retried too many times
        if (activedJob.retryCount >= 5) {
            return {
                success: false,
                message: 'Maximum retry attempts (5) reached for this job'
            };
        }

        try {
        // Update status to retrying
        activedJob.status = 'completed';
        activedJob.retryCount += 1;
        activedJob.lastRetryAttempt = new Date();
        await this.jobsService.saveActiveJob(activedJob);

        const imagePath = `/uploads/scans/${activedJob.fileName}`;

        const newJob = await this.scanQueue.add(
            'process_and_create_scan',
            {
                imagePath: imagePath,
                originalName: activedJob.fileName,
                scanType: "KHB",
                user: user,
            },
            {
                jobId: activedJob.jobId,
            }
        );

        return {
            success: true,
            message: `Job ${newJob.id} queued for retry (attempt in ${activedJob.status})`,
            newJobId: newJob.id.toString()
        };

        } catch (error) {
            // Revert status if retry fails
            activedJob.status = 'failed';
            await this.jobsService.saveActiveJob(activedJob);

            throw new Error(`Failed to retry job: ${error.message}`);
        }
    }

    async retryAllActivedFailedJobs(user: User): Promise<{ total: number; successful: number; failed: number }> {
        const activedJobs = await this.jobsService.getAllActivedJobsByStatus('active');

        let successful = 0;
        let failed = 0;

        for (const job of activedJobs) {
            try {
                await this.retryActivedFailedJob(job.jobId, user);
                successful++;
            } catch (error) {
                console.error(`Active Failed to retry job ${job.jobId}:`, error.message);
                failed++;
            }
        }

        return {
            total: activedJobs.length,
            successful,
            failed
        };
    }


    async retryFailedJob(jobId: string, user: User): Promise<{ success: boolean; message: string; newJobId?: string }> {
        const activedJob = await this.jobsService.findActiveJobByJobId(jobId);

        if (!activedJob) {
            throw new NotFoundException(`Actived job with ID ${jobId} not found`);
        }

        // Check if job has been retried too many times
        if (activedJob.retryCount >= 5) {
            return {
                success: false,
                message: 'Maximum retry attempts (5) reached for this job'
            };
        }

        try {
        // Update status to retrying
        activedJob.status = 'completed';
        activedJob.retryCount += 1;
        activedJob.lastRetryAttempt = new Date();
        await this.jobsService.saveActiveJob(activedJob);

        const imagePath = `/uploads/scans/${activedJob.fileName}`;

        const newJob = await this.scanQueue.add(
            'process_and_create_scan',
            {
                imagePath: imagePath,
                originalName: activedJob.fileName,
                scanType: "KHB",
                user: user,
            },
            {
                jobId: activedJob.jobId,
            }
        );

        return {
            success: true,
            message: `Job ${newJob.id} queued for retry (attempt in ${activedJob.status})`,
            newJobId: newJob.id.toString()
        };

        } catch (error) {
            // Revert status if retry fails
            activedJob.status = 'failed';
            await this.jobsService.saveActiveJob(activedJob);

            throw new Error(`Failed to retry job: ${error.message}`);
        }
    }
}