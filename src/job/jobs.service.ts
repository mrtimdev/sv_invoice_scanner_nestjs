// jobs.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobStatus, AnyJob, isFailedJob, isActiveJob, isCompletedJob } from '../../src/enums/job.types';
import { CompletedJob } from 'src/entities/completed-job.entity';
import { WaitingJob } from 'src/entities/waiting-job.entity';
import { ActiveJob } from 'src/entities/active-job.entity';
import { FailedJob } from 'src/entities/failed-job.entity';
import { DelayedJob } from 'src/entities/delayed-job.entity';

@Injectable()
export class JobsService {
    constructor(
        @InjectRepository(FailedJob) private failedJobRepository: Repository<FailedJob>,
        @InjectRepository(ActiveJob) private activeJobRepository: Repository<ActiveJob>,
        @InjectRepository(CompletedJob) private completedJobRepository: Repository<CompletedJob>,
        @InjectRepository(WaitingJob) private waitingJobRepository: Repository<WaitingJob>,
        @InjectRepository(DelayedJob) private delayedJobRepository: Repository<DelayedJob>,
    ) {}


    async createFailedJob(
        jobId: string,
        jobName: string,
        fileName: string,
        errorMessage: string,
        jobData: any,
        userId?: number
    ): Promise<FailedJob> {
        const failedJob = this.failedJobRepository.create({
            jobId,
            jobName,
            fileName,
            errorMessage,
            jobData,
            userId,
            retryCount: 0,
            status: 'failed' as JobStatus
        });
        return this.failedJobRepository.save(failedJob);
    }

    async createActiveJob(
        jobId: string,
        jobName: string,
        fileName: string,
        jobData: any,
        userId?: number
    ): Promise<ActiveJob> {
        const activeJob = this.activeJobRepository.create({
            jobId,
            jobName,
            fileName,
            jobData,
            userId,
            progress: 0,
            status: 'active' as JobStatus
        });
        return this.activeJobRepository.save(activeJob);
    }

    async saveActiveJob(activeJob: ActiveJob): Promise<ActiveJob> {
        return this.activeJobRepository.save(activeJob);
    }

    async createCompletedJob(
        jobId: string,
        jobName: string,
        fileName: string,
        result: any,
        jobData: any,
        userId?: number
    ): Promise<CompletedJob> {
        const completedJob = this.completedJobRepository.create({
            jobId,
            jobName,
            fileName,
            result,
            jobData,
            userId,
            status: 'completed' as JobStatus
        });
        return this.completedJobRepository.save(completedJob);
    }

    async createWaitingJob(
        jobId: string,
        jobName: string,
        fileName: string,
        jobData: any,
        userId?: number,
        priority: number = 1
    ): Promise<WaitingJob> {
        const waitingJob = this.waitingJobRepository.create({
            jobId,
            jobName,
            fileName,
            jobData,
            userId,
            priority,
            status: 'waiting' as JobStatus
        });
        return this.waitingJobRepository.save(waitingJob);
    }

    async createDelayedJob(
        jobId: string,
        jobName: string,
        fileName: string,
        jobData: any,
        delayedUntil: Date,
        delayReason: string,
        userId?: number
    ): Promise<DelayedJob> {
        const delayedJob = this.delayedJobRepository.create({
            jobId,
            jobName,
            fileName,
            jobData,
            delayedUntil,
            delayReason,
            userId,
            status: 'delayed' as JobStatus
        });
        return this.delayedJobRepository.save(delayedJob);
    }

    async upsertActiveJob(
        jobId: string,
        jobName: string,
        fileName: string,
        jobData: any,
        userId?: number,
        startedAt?: Date
    ): Promise<ActiveJob> {
        // First try to find existing active job
        let activeJob = await this.activeJobRepository.findOne({ where: { jobId } });
        
        if (activeJob) {
            // Update existing job
            activeJob.jobName = jobName;
            activeJob.fileName = fileName;
            activeJob.jobData = jobData;
            activeJob.startedAt = startedAt || new Date();
            
            return this.activeJobRepository.save(activeJob);
        } else {
            // Create new active job
            const newActiveJob = this.activeJobRepository.create({
                jobId,
                jobName,
                fileName,
                jobData,
                userId,
                startedAt: startedAt || new Date(),
                status: 'active' as JobStatus
            });
            
            return this.activeJobRepository.save(newActiveJob);
        }
    }

    async removeActiveJob(jobId: string): Promise<void> {
        await this.activeJobRepository.delete({ jobId });
    }

    async getJobsByStatus(status: JobStatus): Promise<AnyJob[]> {
        switch (status) {
            case 'failed':
            case 'retrying':
            case 'resolved':
                const failedJobs = await this.failedJobRepository.find({ 
                    where: { status },
                    order: { failedAt: 'DESC' } 
                });
                return failedJobs as AnyJob[];
                
            case 'active':
                const activeJobs = await this.activeJobRepository.find({ 
                    order: { startedAt: 'DESC' } 
                });
                return activeJobs as AnyJob[];
                
            case 'completed':
                const completedJobs = await this.completedJobRepository.find({ 
                    order: { completedAt: 'DESC' } 
                });
                return completedJobs as AnyJob[];
                
            case 'waiting':
                const waitingJobs = await this.waitingJobRepository.find({ 
                    order: { queuedAt: 'DESC' } 
                });
                return waitingJobs as AnyJob[];
                
            case 'delayed':
                const delayedJobs = await this.delayedJobRepository.find({ 
                    order: { delayedUntil: 'DESC' } 
                });
                return delayedJobs as AnyJob[];
                
            default:
                const exhaustiveCheck: never = status;
                throw new Error(`Unhandled job status: ${status}`);
        }
    }

    async getAllJobs(): Promise<AnyJob[]> {
        const [
            failedJobs,
            activeJobs,
            completedJobs,
            waitingJobs,
            delayedJobs
        ] = await Promise.all([
            this.failedJobRepository.find({ order: { failedAt: 'DESC' } }),
            this.activeJobRepository.find({ order: { startedAt: 'DESC' } }),
            this.completedJobRepository.find({ order: { completedAt: 'DESC' } }),
            this.waitingJobRepository.find({ order: { queuedAt: 'DESC' } }),
            this.delayedJobRepository.find({ order: { delayedUntil: 'DESC' } })
        ]);

        // Combine all jobs and sort by creation date
        const allJobs: AnyJob[] = [
            ...failedJobs as AnyJob[],
            ...activeJobs as AnyJob[],
            ...completedJobs as AnyJob[],
            ...waitingJobs as AnyJob[],
            ...delayedJobs as AnyJob[]
        ];

        return allJobs.sort((a, b) => {
            const dateA = a.createdAt || new Date(0);
            const dateB = b.createdAt || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }

    async updateJobStatus(jobId: string, newStatus: JobStatus): Promise<any> {
        // Determine which repository to use based on the new status
        switch (newStatus) {
            case 'failed':
            case 'retrying':
            case 'resolved':
                return this.failedJobRepository.update(
                    { jobId },
                    { status: newStatus, ...(newStatus === 'retrying' && { lastRetryAttempt: new Date() }) }
                );
                
            case 'active':
                return this.activeJobRepository.update(
                    { jobId },
                    { status: newStatus, startedAt: new Date() }
                );
                
            case 'completed':
                return this.completedJobRepository.update(
                    { jobId },
                    { status: newStatus, completedAt: new Date() }
                );
                
            case 'waiting':
                return this.waitingJobRepository.update(
                    { jobId },
                    { status: newStatus, queuedAt: new Date() }
                );
                
            case 'delayed':
                return this.delayedJobRepository.update(
                    { jobId },
                    { status: newStatus }
                );
                
            default:
                const exhaustiveCheck: never = newStatus;
                throw new Error(`Unhandled job status: ${newStatus}`);
        }
    }

    async deleteJob(jobId: string, status: JobStatus): Promise<void> {
        switch (status) {
            case 'failed':
            case 'retrying':
            case 'resolved':
                await this.failedJobRepository.delete({ jobId });
                break;
                
            case 'active':
                await this.activeJobRepository.delete({ jobId });
                break;
                
            case 'completed':
                await this.completedJobRepository.delete({ jobId });
                break;
                
            case 'waiting':
                await this.waitingJobRepository.delete({ jobId });
                break;
                
            case 'delayed':
                await this.delayedJobRepository.delete({ jobId });
                break;
                
            default:
                const exhaustiveCheck: never = status;
                throw new Error(`Unhandled job status: ${status}`);
        }
    }

    async incrementRetryCount(jobId: string): Promise<void> {
        await this.failedJobRepository.increment(
            { jobId },
            'retryCount',
            1
        );
        await this.failedJobRepository.update(
            { jobId },
            { lastRetryAttempt: new Date(), status: 'retrying' as JobStatus }
        );
    }

    async resolveFailedJob(jobId: string): Promise<void> {
        await this.failedJobRepository.update(
            { jobId },
            { status: 'resolved' as JobStatus }
        );
    }


    // Add these to your existing JobsService
    async getFailedJobByJobId(jobId: string): Promise<FailedJob | null> {
        return this.failedJobRepository.findOne({ where: { jobId } });
    }

    async removeFailedJobByJobId(jobId: string): Promise<void> {
        await this.failedJobRepository.delete({ jobId });
    }

    async findFailedJobById(jobId: string): Promise<FailedJob | null> {
        return this.failedJobRepository.findOne({ where: { jobId } });
    }

    async findActiveJobByJobId(jobId: string): Promise<ActiveJob | null> {
        return this.activeJobRepository.findOne({ where: { jobId } });
    }

    async findActiveJobById(id: number): Promise<ActiveJob | null> {
        return this.activeJobRepository.findOne({ where: { id } });
    }

    async getAllActivedJobs(): Promise<ActiveJob[]> {
        return this.activeJobRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async getAllActivedJobsByStatus(status: JobStatus): Promise<ActiveJob[]> {
        return this.activeJobRepository.find({
            where: { status: status }
        });
    }
  
}

