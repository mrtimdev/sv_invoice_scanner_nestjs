// scans/scan.entity.ts
import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity("scans")
export class Scan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'image_path' })
    imagePath: string;

    @Column({ name: 'scanned_text', type: 'text', nullable: true })
    scannedText: string;

    @ManyToOne(() => User, user => user.scans, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        name: 'date',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP' 
    })
    date: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;
}