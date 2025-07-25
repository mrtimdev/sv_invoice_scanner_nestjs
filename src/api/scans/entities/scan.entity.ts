// scans/scan.entity.ts
import { User } from 'src/entities/user.entity';
import { ScanType } from 'src/enums/scan-type.enum';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity("scans")
export class Scan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'image_path' })
    imagePath: string;

    @Column({ name: 'scanned_text', type: 'text', nullable: true })
    scannedText: string;

    @Column({
        name: 'scan_type',
        type: 'enum',
        enum: ScanType,
        nullable: true,
    })
    scanType: ScanType;

    @ManyToOne(() => User, user => user.scans, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        name: 'date',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP' 
    })
    date: Date;

    @Column({
        name: 'invoice_date',
        type: 'date',
        nullable: true,
    })
    invoiceDate: Date | null;

    @Column({
        name: 'route',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    route: string | null;

    @Column({
        name: 'sale_order',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    saleOrder: string | null;

    @Column({
        name: 'warehouse',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    warehouse: string | null;

    @Column({
        name: 'vendor_code',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    vendorCode: string | null;

    @Column({
        name: 'vehicle_no',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    vehicleNo: string | null;

    @Column({
        name: 'effective_date',
        type: 'date',
        nullable: true,
    })
    effectiveDate: Date | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;
}