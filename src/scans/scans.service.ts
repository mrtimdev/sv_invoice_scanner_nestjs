// scans/scans.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateScanDto } from './dto/create-scan.dto';
import { User } from 'src/users/entities/user.entity';
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

    async findById(id: number): Promise<Scan | null> {
        const scan = await this.scanRepository.findOneBy({ id: id });
        return scan;
    }
}