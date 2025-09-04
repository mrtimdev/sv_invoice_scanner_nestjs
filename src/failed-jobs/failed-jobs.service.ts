// failed-jobs.service.ts
import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { FailedJob } from 'src/entities/failed-job.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FailedJobsService {
    constructor(
        @InjectRepository(FailedJob)
        private failedJobsRepository: Repository<FailedJob>,
        @InjectQueue('scan') private readonly scanQueue: Queue,
    ) {}


    async findFailedJobByByJobId(jobId: string): Promise<FailedJob | null> {
        const job = await this.failedJobsRepository.findOne({ where: { jobId } });
        if (!job) {
            return null;
        }
        return job;
    }

    async createFailedJob(
        jobId: string,
        jobName: string,
        fileName: string,
        errorMessage: string,
        jobData?: any,
        userId?: number,
    ): Promise<FailedJob> {
        const failedJob = this.failedJobsRepository.create({
            jobId,
            jobName,
            fileName,
            errorMessage,
            failedAt: new Date(),
            jobData: jobData ? JSON.stringify(jobData) : null,
            status: 'failed',
            retryCount: 0,
            userId: userId
        });

        return this.failedJobsRepository.save(failedJob);
    }

    async getAllFailedJobs(): Promise<FailedJob[]> {
        return this.failedJobsRepository.find({
        order: { failedAt: 'DESC' },
        });
    }


    async getFailedJobById(id: number): Promise<FailedJob> {
        const job = await this.failedJobsRepository.findOne({ where: { id } });
        if (!job) {
            throw new NotFoundException(`Failed job with ID ${id} not found`);
        }
        return job;
    }

    async deleteFailedJob(id: number): Promise<void> {
        await this.failedJobsRepository.delete(id);
    }

    async clearAllFailedJobs(): Promise<void> {
        await this.failedJobsRepository.clear();
    }




    async retryFailedJob(jobId: string, user: User): Promise<{ success: boolean; message: string; newJobId?: string }> {
        const failedJob = await this.failedJobsRepository.findOne({ 
        where: { jobId } 
        });

        if (!failedJob) {
        throw new NotFoundException(`Failed job with ID ${jobId} not found`);
        }

        // Check if job has been retried too many times
        if (failedJob.retryCount >= 5) {
        return {
            success: false,
            message: 'Maximum retry attempts (5) reached for this job'
        };
        }

        try {
        // Update status to retrying
        failedJob.status = 'retrying';
        failedJob.retryCount += 1;
        failedJob.lastRetryAttempt = new Date();
        await this.failedJobsRepository.save(failedJob);


        const imagePath = `/uploads/scans/${failedJob.fileName}`;

        // Use YOUR exact queue adding code with the original job data
        const newJob = await this.scanQueue.add(
            'process_and_create_scan',
            {
                imagePath: imagePath,
                originalName: failedJob.fileName,
                scanType: "KHB",
                user: user,
            },
            {
                jobId: failedJob.jobId,
            }
        );

        // console.log("newJob: ", {failedJob, user})

        return {
            success: true,
            message: `Job ${newJob.id} queued for retry (attempt ${failedJob.retryCount})`,
            newJobId: newJob.id.toString()
        };

        } catch (error) {
        // Revert status if retry fails
        failedJob.status = 'failed';
        await this.failedJobsRepository.save(failedJob);

        throw new Error(`Failed to retry job: ${error.message}`);
        }
    }

    async retryAllFailedJobs(user: User): Promise<{ total: number; successful: number; failed: number }> {
        const failedJobs = await this.failedJobsRepository.find({
            where: { status: 'failed' }
        });

        let successful = 0;
        let failed = 0;

        for (const job of failedJobs) {
            try {
                await this.retryFailedJob(job.jobId, user);
                successful++;
            } catch (error) {
                console.error(`Failed to retry job ${job.jobId}:`, error.message);
                failed++;
            }
        }

        return {
            total: failedJobs.length,
            successful,
            failed
        };
    }


    async removeFailedJobByJobId(jobId: string): Promise<boolean> {
        const result = await this.failedJobsRepository.delete({ jobId });
        return (result.affected ?? 0) > 0;
    }

    async removeFailedJob(id: number): Promise<boolean> {
        const result = await this.failedJobsRepository.delete(id);
        return (result.affected ?? 0) > 0;
    }

    async getFailedJobByJobId(jobId: string): Promise<FailedJob | null> {
        return this.failedJobsRepository.findOne({ where: { jobId } });
    }
}