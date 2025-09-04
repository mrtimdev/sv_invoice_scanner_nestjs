// active-job.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import { JobStatus } from "src/enums/job.types";

@Entity()
export class ActiveJob {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    jobId: string;

    @Column()
    jobName: string;

    @Column()
    fileName: string;

    @Column({ type: "json", nullable: true })
    jobData: any;

    @Column({ default: 0 })
    progress: number;

    @CreateDateColumn()
    startedAt: Date;

    @Column({ default: 'active' })
    status: JobStatus;

    @Column({ default: 0 })
    retryCount: number;
    
    @Column({ nullable: true })
    lastRetryAttempt: Date;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', nullable: true })
    userId: number;

    @CreateDateColumn()
    createdAt: Date;
}