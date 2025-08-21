// scans/scans.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, LessThan, MoreThan, Repository } from 'typeorm';
import { CreateScanDto } from './dto/create-scan.dto';
import { User } from 'src/entities/user.entity';
import { Scan } from './entities/scan.entity';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { InvoiceDataDto } from './dto/invoice-data.dto';
import { existsSync, unlinkSync } from 'fs';
import * as fs from 'fs';
import * as FormData from 'form-data';
import fetch from 'node-fetch';
import * as path from 'path';
import { ScanType } from 'src/enums/scan-type.enum';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { DocumentProcessorService } from 'src/admin/scans/document-processor.service';
import { TextParserService } from './text-parser.service';

// Define regex patterns for extracting fields

@Injectable()
export class ScansService {
    
    constructor(
        @InjectRepository(Scan)
        private scanRepository: Repository<Scan>,
        private readonly documentProcessor: DocumentProcessorService,
        private readonly textParserService: TextParserService,
        // @InjectQueue('image_processing') private readonly imageProcessingQueue: Queue,
    ) {}
    

    async create(createScanDto: CreateScanDto, user: User): Promise<Scan> {
        const scan = this.scanRepository.create({
            imagePath: createScanDto.imagePath,
            originalName: createScanDto.originalName,
            scannedText: createScanDto.scannedText,
            scanType: createScanDto.scanType || ScanType.GENERAL,
            user
        });
        const savedScan = await this.scanRepository.save(scan);
        console.log('Scan created:', savedScan);
        // await this.addToImageProcessingQueue(savedScan);
        return savedScan;
    }


    // private async addToImageProcessingQueue(scan: Scan) {
    //     try {
    //         await this.imageProcessingQueue.add(
    //             'remove_bg_and_crop',
    //             {
    //                 scanId: scan.id,
    //                 originalImagePath: scan.imagePath,
    //             },
    //             {
    //                 jobId: `scan-${scan.id}`,
    //                 removeOnComplete: true,
    //                 attempts: 3,
    //                 backoff: { type: 'exponential', delay: 5000 },
    //                 timeout: 60_000, // 60 seconds
    //             },
    //         );
    //         console.log(`AI processing job added for scan ID: ${scan.id}`);
    //     } catch (error) {
    //         console.error(`Failed to queue AI job for scan ${scan.id}: ${error.message}`);
    //     }
    // }

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

        const scans = await this.scanRepository.find({
            where,
            take: limit,
            order: { date: 'DESC' },
            relations: ['user'],
        });

        return Promise.all(scans.map(scan => this.addCroppedPath(scan)));

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



    extractDocumentFields(text: string) {
        const results = {
        effectiveDate: this.extractEffectiveDate(text),
        ...this.extractStandardFields(text),
        };
        return results;
    }

    private extractEffectiveDate(text: string): string | null {
        // Handle multiple possible formats
        const formats = [
        /effective\s*date\s*:\s*(\d{2}-\d{2}-\d{4})/i,  // "Effective Date: 01-08-2024"
        /effective\s*date\s*[\s:]*([^\n]+)/i,          // Fallback for other formats
        /(?:eff|exp|valid).*date\s*[\s:]*([^\n]+)/i    // Common OCR variations
        ];

        for (const regex of formats) {
        const match = regex.exec(text);
        if (match) {
            const rawDate = match[1].trim();
            return this.normalizeDate(rawDate);
        }
        }
        
        return null;
    }

    private normalizeDate(rawDate: string): string {
        // Standardize date format (DD-MM-YYYY to YYYY-MM-DD)
        const dateMatch = rawDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dateMatch) {
        return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        }
        return rawDate; // Return original if format doesn't match
    }

    private extractStandardFields(text: string) {
        const patterns = {
        deliveryOrder: /delivery\s*order\s*([^\n]+)/i,
        date: /date\s*([^\n]+)/i,
        dealerCode: /dealer\s*code\s*([^\n]+)/i,
        route: /route\s*([^\n]+)/i,
        saleOrder: /sale\s*order\s*([^\n]+)/i,
        warehouse: /warehouse\s*([^\n]+)/i,
        vendorCode: /vendor\s*code\s*([^\n]+)/i,
        vehicleNo: /vehicle\s*no\s*([^\n]+)/i,
        };

        const results = {};
        for (const [key, regex] of Object.entries(patterns)) {
        const match = regex.exec(text);
        results[key] = match ? match[1].trim() : null;
        }
        return results;
    }



    async removeBackgroundAndAutoCrop(image_path: string): Promise<void> {
        const filename = path.basename(image_path);
        const originalPath = join(process.cwd(), 'uploads/scans', filename);
        if (!existsSync(originalPath)) {
            throw new Error(`Input file does not exist: ${originalPath}`);
        }
            
        try {
            
            console.log({filename});
            let croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(originalPath));
            formData.append('size', 'auto');
            const response = await fetch('http://38.242.149.46:8000/timdev/api/v1/image_service/bg_remover', {
                method: 'POST',
                body: formData,
            });

            // 4. Handle response
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // 5. Save result
            const resultBuffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(croppedPath, resultBuffer);
            console.log('✅ Background removed successfully:', croppedPath);
        } catch (error) {
            console.error('❌ Background removal failed:', error);
            throw error;
        }

    }

    // OCR
    async OcrApi(image_path: string): Promise<string> {
        const filename = path.basename(image_path);
        const originalPath = join(process.cwd(), 'uploads/scans', filename);

        if (!existsSync(originalPath)) {
            throw new Error(`Input file does not exist: ${originalPath}`);
        }

        try {
            console.log({ filename });

            const formData = new FormData();
            formData.append('file', fs.createReadStream(originalPath));

            const response = await fetch('http://38.242.149.46:8000/timdev/api/v1/image_service/ocr', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const json = await response.json();
            console.log('✅ OCR Text:', json.text);
            return json.text;
        } catch (error) {
            console.error('❌ OCR failed:', error);
            throw error;
        }
    }



    async update(id: number, data: Partial<Scan>): Promise<void> {
        await this.scanRepository.update(id, data);
    }


    // new for extract
    extractTextWithTextParser(text: string) {
        const results = {
            effectiveDate: this.extractEffectiveDate(text),
            ...this.textParserService.extractDocumentFields(text),
            PD: this.extractDateBetweenPhumAndKhan(text)
        };
        console.log("With PD: ", {results})
        return results;
    }

    private extractPD(text: string): string[] {
        const results: string[] = [];

        // Match pattern like "PD: 28.07.2025" or "PD : 28.07.2025"
        const regex = /PD\s*:?[\s]*([0-9]{2}[./-][0-9]{2}[./-][0-9]{4})/gi;

        let match: string[] | null;
        while ((match = regex.exec(text)) !== null) {
            results.push(match[1]); // Push the date value found after "PD:"
        }

        return results;
    }

    private extractDateBetweenPhumAndKhan(text: string): string[] {
        const results: string[] = [];
        const lines = text.split(/\r?\n/);

        const startPattern = /^Phum Chueng Ek/i;
        const endPattern = /^khan Dangkor/i;
        const dateRegex = /\b\d{2}[.,/-]\d{2}[.,/-]\d{2,4}\b/;

        let i = 0;
        while (i < lines.length - 5) {
            // Look for two consecutive 'Phum Chueng Ek' lines
            if (startPattern.test(lines[i]) && startPattern.test(lines[i + 1])) {
            const possibleDateLine = lines[i + 2];
            const match = possibleDateLine.match(dateRegex);
            if (match) {
                let date = match[0];

                // Normalize separator to dot
                date = date.replace(/[,-/]/g, '.');

                // Fix 3-digit year → 2025
                date = date.replace(/(\d{2}\.\d{2}\.)(\d{3})\b/, (_, prefix, year) => prefix + '2' + year);

                results.push(date);
                i += 6; // Skip full block
                continue;
            }
            }
            i++;
        }

        return results;
        }





    async OCRText(image_path: string) {
        return this.documentProcessor.OCRText(image_path);
    }



}