// src/queue/image-processing.processor.ts
import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
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

@Processor('image_processing') // This processor listens to the 'image_processing' queue
export class ImageProcessingProcessor {
    constructor(
        private readonly scansService: ScansService, 
        private  readonly configService: ConfigService // Inject ConfigService if you need to access environment variables
    ) {}

    @Process('remove_bg_and_crop') // This method processes jobs with the name 'remove_bg_and_crop'
    async handleImageProcessing(job: Job<{ scanId: number; originalImagePath: string }>) {
        const { scanId, originalImagePath } = job.data;
        console.log(`Processing job ${job.id} for scan ${scanId}`);

        const filename = path.basename(originalImagePath);
        const originalFilePath = join(process.cwd(), originalImagePath); // Reconstruct full path

        if (!existsSync(originalFilePath)) {
            console.error(`Input file does not exist for job ${job.id}: ${originalFilePath}`);
            throw new Error(`Input file not found: ${originalFilePath}`); // Throw to mark job as failed
        }

        try {
            let croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(originalFilePath));
            formData.append('size', 'auto');

            const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
            if (!aiServiceUrl) {
                throw new Error('AI_SERVICE_URL is not defined in environment variables');
            }
            const response = await fetch(aiServiceUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const resultBuffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(croppedPath, resultBuffer);
            console.log(`✅ Background removed successfully for job ${job.id}: ${croppedPath}`);

            // Update the scan entity in the database
            await this.scansService.update(scanId, {
                processedImagePath: `/uploads/scans/cropped-${filename}`, // Assuming you add this field
                processingStatus: ProcessingStatus.COMPLETED, // Add a status field to your Scan entity
            });

            // You can also report progress (e.g., if there were multiple steps)
            job.progress(100); // 100% complete

        } catch (error) {
            console.error(`❌ Background removal for job ${job.id} failed:`, error.message);
            // Update scan status to indicate failure
            await this.scansService.update(scanId, {
                processingStatus: ProcessingStatus.FAILED,
                processingError: error.message,
            });
            throw error; // Re-throw to mark the job as failed in Bull
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
}