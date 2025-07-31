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

@Processor('scan')
export class ScanProcessor {
  constructor(private readonly scanService: ScansService,
    private  readonly configService: ConfigService
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

    // Optional: Listen to job completion/failure events for logging or other actions
    @OnQueueCompleted()
    onCompleted(job: Job) {
        console.log(`Job ${job.id} of type ${job.name} completed.`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        console.error(`Job ${job.id} of type ${job.name} failed with error: ${error.message}`);
    }



//   async handleRemoveBg(job: Job) {
//     const { file, imagePath } = job.data;
//     console.log(`Processing job ${job.id} for file ${file.originalname}`);
//     await this.scanService.removeBackgroundAndAutoCrop(file, imagePath);
//   }
}
