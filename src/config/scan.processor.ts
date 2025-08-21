// scan.processor.ts
import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { existsSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch'; 
import { ScansService } from 'src/api/scans/scans.service';
import { ProcessingStatus } from 'src/enums/scan-processing.enum';
import { ConfigService } from '@nestjs/config';
import { ScanType } from 'src/enums/scan-type.enum';
import { DocumentProcessorService } from 'src/admin/scans/document-processor.service';
import { TextParserService } from 'src/api/scans/text-parser.service';
import { User } from 'src/entities/user.entity';
import { unlink } from 'fs/promises';
import { AdminService } from 'src/admin/admin.service';

@Processor('scan')
export class ScanProcessor {
  constructor(private readonly scanService: ScansService,
    private  readonly configService: ConfigService,
    private readonly adminService: AdminService,
    // private readonly documentProcessor: DocumentProcessorService,
    // private readonly textParserService: TextParserService,
  ) {}

    @Process('remove_bg_and_crop')
    async handleImageProcessing(job: Job<{ scanId: number; originalImagePath: string }>) {
        const { scanId, originalImagePath } = job.data;
        console.log(`Processing job ${job.id} for scan ${scanId}`);

        const fullPath = join(process.cwd(), originalImagePath);

        if (!existsSync(fullPath)) {
        console.error(`Input file does not exist for job ${job.id}: ${fullPath}`);
        throw new Error(`Input file not found: ${fullPath}`);
        }

        try {
            const processedImagePath = await this.scanService.removeBackgroundAndAutoCrop(fullPath);

            console.log(`✅ Background removed successfully for job ${job.id}: ${processedImagePath}`);

            await this.scanService.update(scanId, {
                // processedImagePath: processedImagePath,
                processingStatus: ProcessingStatus.COMPLETED,
            });

            job.progress(100);
        } catch (error) {
            console.error(`❌ Background removal for job ${job.id} failed:`, error.message);
            await this.scanService.update(scanId, {
                processingStatus: ProcessingStatus.FAILED,
                processingError: error.message,
            });
        throw error;
        }
    
    }


    @Process('process_and_create_scan')
    async handleProcessAndCreateScan(job: Job<{ imagePath: string; originalName: string, scanType: ScanType; user: User }>) {
        const { imagePath, originalName, scanType, user } = job.data;

        job.progress(5);

        if (!user) throw new Error('User not found');

        // const text = await this.scanService.OcrApi(imagePath);
        
        const { text } = await this.scanService.OCRText(imagePath);
        console.log({text});
        if (!text) {
            const filePath = join(process.cwd(), imagePath);
            const filename = path.basename(imagePath);
            const croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
            const errorDir = join(process.cwd(), 'uploads', 'error-scans');

            // Ensure the destination folder exists
            if (!existsSync(errorDir)) {
                await fs.promises.mkdir(errorDir, { recursive: true });
            }

            const errorFilePath = join(errorDir, filename);
            const errorCroppedPath = join(errorDir, `cropped-${filename}`);

            // Move the original file if it exists
            if (existsSync(filePath)) {
                await fs.promises.rename(filePath, errorFilePath);
            }

            // Move the cropped file if it exists
            if (existsSync(croppedPath)) {
                await fs.promises.rename(croppedPath, errorCroppedPath);
            }

            job.progress(100); // Mark job as finished

            // Return something useful to log or display
            console.table(`OCR failed for file ${filename}, moved to error-scans.`)
            job.progress(100);
            return {
                success: false,
                message: `OCR failed. File moved to error-scans: ${filename}`,
                scan: null,
            };
        } else {
            job.progress(30);

            const createScanDto = {
                imagePath,
                originalName,
                scannedText: text,
                scanType,
            };

            const scan = await this.scanService.create(createScanDto, user);

            const setting = await this.adminService.getSetting();
   
            if (setting && setting.is_scan_with_ai) {
                console.log("Starting auto cropped and remove the background...!");
                await this.scanService.removeBackgroundAndAutoCrop(imagePath);
            }

            job.progress(60);

            if (scanType === ScanType.KHB) {
                const invoiceData: { [key: string]: string | string[] | null | Record<string, string[]> } = this.scanService.extractTextWithTextParser(text);
                if (invoiceData) {
                    const toStringOrNull = (val: any): string | null => {
                        if (typeof val === 'string') return val;
                        if (Array.isArray(val)) return val.join(', ');
                        if (val && typeof val === 'object') return JSON.stringify(val);
                            return null;
                    };

                    const updatedFields = {
                        route: toStringOrNull(invoiceData.route),
                        saleOrder: toStringOrNull(invoiceData.saleOrder),
                        warehouse: toStringOrNull(invoiceData.warehouse),
                        vendorCode: toStringOrNull(invoiceData.vendorCode),
                        vehicleNo: toStringOrNull(invoiceData.vehicleNo),
                        effectiveDate: this.parseDate(typeof invoiceData.effectiveDate === 'string'
                                            ? invoiceData.effectiveDate
                                            : ''),
                        invoiceDate: this.parseDate(typeof invoiceData.invoiceDate === 'string'
                                            ? invoiceData.invoiceDate
                                            : ''),
                    };

                    await this.scanService.update(scan.id, updatedFields);
                }
            }

            job.progress(100);

            return { scan: scan, success: true };
        }
    }

    private parseDate =  (dateStr: string): Date | null => {
        if (!dateStr) return null;

        // Try ISO-style date first
        if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        }

        // Try DD.MM.YYYY or DD/MM/YYYY
        const parts = dateStr.split(/[./]/);
        if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            const date = new Date(year, month - 1, day);
            return isNaN(date.getTime()) ? null : date;
        }

        return null;
    };

    // Optional: Listen to job completion/failure events for logging or other actions
    @OnQueueCompleted()
    onCompleted(job: Job) {
        console.log(`Job ${job.id} of type ${job.name} completed.`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        console.error(`Job ${job.id} of type ${job.name} failed with error: ${error.message}`);
    }

}
