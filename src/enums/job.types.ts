// job.types.ts

import { User } from "src/entities/user.entity";

export type JobStatus = 'active' | 'waiting' | 'delayed' | 'completed' | 'failed' | 'retrying' | 'resolved';

export interface BaseJob {
    id: number;
    jobId: string;
    jobName: string;
    fileName: string;
    jobData: any;
    userId: number | null;
    user?: User;
    createdAt: Date;
}

export interface FailedJob extends BaseJob {
    errorMessage: string;
    failedAt: Date;
    retryCount: number;
    lastRetryAttempt: Date | null;
    status: 'failed' | 'retrying' | 'resolved';
}

export interface ActiveJob extends BaseJob {
    startedAt: Date;
    progress?: number;
    status: 'active';
}

export interface CompletedJob extends BaseJob {
    result: any;
    completedAt: Date;
    status: 'completed';
}

export interface WaitingJob extends BaseJob {
    queuedAt: Date;
    priority: number;
    status: 'waiting';
}

export interface DelayedJob extends BaseJob {
    delayedUntil: Date;
    delayReason: string;
    status: 'delayed';
}

// Union type for all job types
export type AnyJob = FailedJob | ActiveJob | CompletedJob | WaitingJob | DelayedJob;

// Type guards
export function isFailedJob(job: AnyJob): job is FailedJob {
    return job.status === 'failed' || job.status === 'retrying' || job.status === 'resolved';
}

export function isActiveJob(job: AnyJob): job is ActiveJob {
    return job.status === 'active';
}

export function isCompletedJob(job: AnyJob): job is CompletedJob {
    return job.status === 'completed';
}

export function isWaitingJob(job: AnyJob): job is WaitingJob {
    return job.status === 'waiting';
}

export function isDelayedJob(job: AnyJob): job is DelayedJob {
    return job.status === 'delayed';
}