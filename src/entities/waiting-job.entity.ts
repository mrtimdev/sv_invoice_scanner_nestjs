// waiting-job.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import { JobStatus } from "src/enums/job.types";

@Entity()
export class WaitingJob {
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

    @Column({ default: 1 })
    priority: number;

    @CreateDateColumn()
    queuedAt: Date;

    @Column({ default: 'waiting' })
    status: JobStatus;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', nullable: true })
    userId: number;

    @CreateDateColumn()
    createdAt: Date;
}