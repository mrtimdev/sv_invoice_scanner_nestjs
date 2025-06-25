import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Scan } from 'src/scans/entities/scan.entity';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';

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
                'scan.name LIKE :search OR scan.scanned_text LIKE :search', 
                { search: `%${searchValue}%` }
            );
        }
        
        // Add ordering if provided
        if (orderColumn !== undefined && orderDir) {
            const columns = ['scan.date', 'scan.name', 'scan.status']; 
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

}
