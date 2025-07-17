import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { In, Repository } from 'typeorm';
import { unlink,  } from 'fs/promises';
import { join } from 'path';
import * as archiver from 'archiver';
import { promises as fs } from 'fs';
import { Response } from 'express';


@Injectable()
export class ScansService {
    constructor(
        @InjectRepository(Scan)
        private scanRepository: Repository<Scan>,
    ) {}



    async delete(id: number, userId: number): Promise<void> {
        const scan = await this.scanRepository.findOne({
            where: { id, user: { id: userId } }
        });

        if (!scan) {
        throw new Error('Scan not found');
        }

        // Delete file from filesystem
        const filePath = join(process.cwd(), scan.imagePath);
        try {
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
        orderDir?: 'asc' | 'desc'
    ) {
        // Create query builder or ORM query
        let query = this.scanRepository.createQueryBuilder('scan')
            .where('scan.user_id = :userId', { userId })
            .skip(start)
            .take(length);
        
        // Add search if provided
        if (searchValue) {
            console.log({searchValue})
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
        
        const [scans, total] = await query.getManyAndCount();
        
        return { scans, total };
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
        await archive.pipe(res);

        // Add each scan to the archive
        for (const scan of scans) {
            const filePath = join(process.cwd(), scan.imagePath);
            try {
                await fs.access(filePath); 
                archive.file(filePath, { name: scan.imagePath.split('/').pop() });
            } catch (err) {
                console.error(`File not found: ${filePath}`);
            }
        }

        // Finalize the archive
        await archive.finalize();
    }

}
