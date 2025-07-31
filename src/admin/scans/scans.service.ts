import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { In, Repository } from 'typeorm';
import { unlink,  } from 'fs/promises';
import { join } from 'path';
import * as archiver from 'archiver';
import { promises as fs } from 'fs';
import { Response } from 'express';
import { existsSync } from 'fs';
import * as path from 'path';
import { ScanType } from 'src/enums/scan-type.enum';
import { CreateScanDto } from 'src/api/scans/dto/create-scan.dto';
import { User } from 'src/entities/user.entity';


@Injectable()
export class ScansService {
    constructor(
        @InjectRepository(Scan)
        private scanRepository: Repository<Scan>,
    ) {}


    private progressMap = new Map<string, number>();


    setProgress(token: string, value: number) {
        this.progressMap.set(token, value);
    }

    getProgress(token: string): number {
        return this.progressMap.get(token) || 0;
    }

    async delete(id: number, userId: number): Promise<void> {
        const scan = await this.scanRepository.findOne({
            where: { id, user: { id: userId } }
        });

        if (!scan) {
        throw new Error('Scan not found');
        }

        // Delete file from filesystem
        const filePath = join(process.cwd(), scan.imagePath);
        let filename = path.basename(scan.imagePath);
        const croppedPath_ = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
        try {
            if (existsSync(croppedPath_)) {
                await unlink(croppedPath_);
            } 
            await unlink(filePath);
        } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
        }

        // Delete record from database
        await this.scanRepository.delete(id);
    }


    async findAllForUser(userId: number): Promise<Scan[]> {
        const scans = await this.scanRepository.find({
            where: { user: { id: userId } },
            relations: ['user'],
            order: { date: 'DESC' }
        });
        return scans;
    }


    async findForDataTable(
        userId: number,
        start: number,
        length: number,
        searchValue?: string,
        orderColumn?: number,
        orderDir?: 'asc' | 'desc',
        startDate?: string,
        endDate?: string,
        invoiceStartDate?: string,
        invoiceEndDate?: string,
        searchNo?: string,
        searchSaleOrder?: string
    ) {
        // Create query builder or ORM query
        let query = this.scanRepository.createQueryBuilder('scan')
            .where('scan.user_id = :userId', { userId });

        if (length !== -1) {
            query = query.skip(start).take(length);
        }


        if (startDate) {
            query = query.andWhere('DATE(scan.date) >= :startDate', { startDate });
        }
        if (endDate) {
            query = query.andWhere('DATE(scan.date) <= :endDate', { endDate });
        }
        if (searchNo) {
            query = query.andWhere('scan.sale_order LIKE :searchNo', { searchNo: `%${searchNo}%` });
        }
        if (searchSaleOrder) {
            query = query.andWhere('scan.sale_order LIKE :searchSaleOrder', { searchSaleOrder: `%${searchSaleOrder}%` });
        }


        if (invoiceStartDate) {
            query = query.andWhere('DATE(scan.invoice_date) >= :invoiceStartDate', { invoiceStartDate });
        }
        if (invoiceEndDate) {
            query = query.andWhere('DATE(scan.invoice_date) <= :invoiceEndDate', { invoiceEndDate });
        }

        console.log({searchValue, orderDir, length, startDate, endDate})
        
        // Add search if provided
        if (searchValue) {
            
            query = query.andWhere(
                'scan.scanned_text LIKE :search', 
                { search: `%${searchValue}%` }
            );
        }
        
        // Add ordering if provided
        if (orderColumn !== undefined && orderDir) {
            const columns = ['scan.date']; 
            const orderBy = columns[orderColumn] || 'scan.date';
            query = query.orderBy(orderBy, orderDir.toUpperCase() as 'ASC' | 'DESC');
        }

        query.orderBy('id', 'DESC');
        
        const [scans_, total] = await query.getManyAndCount();

        const scans = await Promise.all(scans_.map(scan => this.addCroppedPath(scan)));
        return { scans, total };
    }


    private async addCroppedPath(scan: Scan): Promise<any> {
        let filename = path.basename(scan.imagePath);
        const croppedPath_ = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
        const croppedPath = existsSync(croppedPath_)
            ? `/uploads/scans/cropped-${filename}`
            : null;
        return {
            ...scan,
            croppedPath
        };
    }

    async findById(id: number): Promise<Scan | null> {
        const scan = await this.scanRepository.findOneBy({ id: id });
        return scan;
    }

    async getScansByIds(ids: number[]): Promise<Scan[]> {
        return this.scanRepository.findBy({ id: In(ids) });
    }


    async createZipFile(scanIds: number[], res: Response): Promise<void> {
        // Get selected scans from database
        const scans = await this.getScansByIds(scanIds);
        
        if (scans.length === 0) {
            throw new Error('No scans found');
        }

        // Create a zip archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Compression level
        });

        // Set response headers
        res.header('Content-Type', 'application/zip');
        res.header('Content-Disposition', `attachment; filename="sv-scans-${Date.now()}.zip"`);

        // Pipe archive to response
        archive.pipe(res);

        // Add each scan to the archive
        for (const scan of scans) {
            const filePath = join(process.cwd(), scan.imagePath);
            try {
                await fs.access(filePath);

                // Get original extension
                const originalFileName = scan.imagePath.split('/').pop() || 'unknown.jpg';
                const extension = originalFileName.substring(originalFileName.lastIndexOf('.'));

                // Format scan.date
                const dateObj = new Date(scan.date);
                const datePrefix = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD


                // Final file name
                const customName = `${datePrefix}_${originalFileName}${extension}`;

                archive.file(filePath, { name: customName });

            } catch (err) {
                console.error(`File not found: ${filePath}`);
            }
        }

        // Finalize archive
        await archive.finalize();
    }



    async removeScans(scanIds: number[], res: Response): Promise<void> {
        try {
            if (!scanIds || scanIds.length === 0) {
                res.status(400).json({ message: 'No scan IDs provided' });
                return;
            }
            const scans = await this.getScansByIds(scanIds);
            if (scans.length === 0) {
                res.status(404).json({ message: 'No scans found for the provided IDs' });
                return;
            }
            for (const scan of scans) {
            const filePath = join(process.cwd(), scan.imagePath);
            const filename = path.basename(scan.imagePath);
            const croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);

            try {
                if (existsSync(filePath)) {
                    await unlink(filePath);
                }
                if (existsSync(croppedPath)) {
                    await unlink(croppedPath);
                }
            } catch (err) {
                console.error(`Failed to delete files for scan ID ${scan.id}:`, err);
                // Continue with other files even if one fails
            }
        }
            await this.scanRepository.delete(scanIds); 
            res.status(200).json({ message: 'Scans deleted successfully', deletedIds: scanIds });
        } catch (error) {
            console.error('Error deleting scans:', error);
            res.status(500).json({ message: 'An error occurred while deleting scans' });
        }
    }


    async create(createScanDto: CreateScanDto, user: User): Promise<Scan> {
        const scan = this.scanRepository.create({
            imagePath: createScanDto.imagePath,
            scannedText: createScanDto.scannedText,
            scanType: createScanDto.scanType || ScanType.GENERAL,
            user
        });
        const savedScan = await this.scanRepository.save(scan);
        console.log('Scan created:', savedScan);
        // await this.addToImageProcessingQueue(savedScan);
        return savedScan;
    }

    async update(id: number, data: Partial<Scan>): Promise<void> {
        await this.scanRepository.update(id, data);
    }


}
