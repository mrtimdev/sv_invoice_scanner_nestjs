// scans/scans.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, LessThan, MoreThan, Repository } from 'typeorm';
import { CreateScanDto } from './dto/create-scan.dto';
import { User } from 'src/entities/user.entity';
import { Scan } from './entities/scan.entity';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ScansService {
    constructor(
        @InjectRepository(Scan)
        private scanRepository: Repository<Scan>,
    ) {}

    async create(createScanDto: CreateScanDto, user: User): Promise<Scan> {
        const scan = this.scanRepository.create({
            imagePath: createScanDto.imagePath,
            scannedText: createScanDto.scannedText,
            user
        });
        return this.scanRepository.save(scan);
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

    async findAllForUserWithFilterKeys(userId: number, filter?: string, search?: string): Promise<Scan[]> {
        const where: any = {
            user: { id: userId }
        };

        // Apply date filtering
        const today = new Date();
        const start = new Date();
        const end = new Date();

        switch (filter) {
            case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            where.date = Between(start, end);
            break;
            case 'yesterday':
            start.setDate(today.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(today.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            where.date = Between(start, end);
            break;
            case 'last7Days':
            start.setDate(today.getDate() - 6);
            where.date = Between(start, today);
            break;
            case 'last30Days':
            start.setDate(today.getDate() - 29);
            where.date = Between(start, today);
            break;
            default:
            break;
        }

        // Search text in scannedText
        if (search) {
            where.scannedText = ILike(`%${search}%`);
        }

        return this.scanRepository.find({
            where,
            relations: ['user'],
            order: { date: 'DESC' },
        });
    }


    async paginatedForUser(
        userId: number,
        limit: number,
        before?: string,
        after?: string,
        search?: string,
        filter?: string,
        ): Promise<Scan[]> {
        const where: any = { user: { id: userId } };

        // Date filter
        const today = new Date();
        const start = new Date();
        const end = new Date();
        switch (filter) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                where.date = Between(start, end);
            break;
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(today.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                where.date = Between(start, end);
            break;
            case 'last7Days':
                start.setDate(today.getDate() - 6);
                where.date = Between(start, today);
            break;
            case 'last30Days':
                start.setDate(today.getDate() - 29);
                where.date = Between(start, today);
            break;
        }

        if (search) {
            where.scannedText = ILike(`%${search}%`);
        }

        if (before) {
            where.date = LessThan(new Date(before));
        } else if (after) {
            where.date = MoreThan(new Date(after));
        }

        return await this.scanRepository.find({
            where,
            take: limit,
            order: { date: 'DESC' },
            relations: ['user'],
        });
    }



    async findById(id: number): Promise<Scan | null> {
        const scan = await this.scanRepository.findOneBy({ id: id });
        return scan;
    }
}