import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class Setting {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: false })
    is_scan_with_ai: boolean;

    @Column({ type: 'text', nullable: true })
    description: string;
}
