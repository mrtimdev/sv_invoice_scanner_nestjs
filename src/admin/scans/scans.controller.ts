import { Body, Controller, Get, Header, HttpException, HttpStatus, Logger, NotFoundException, Param, Post, Query, Render, Req, Res, Sse, StreamableFile, UploadedFile, UseGuards, UseInterceptors, Headers, InternalServerErrorException, UploadedFiles, ForbiddenException  } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/api/auth/guards/authenticated.guard';
import { Response, Request } from 'express';
import { User } from 'src/entities/user.entity';
import { ScansService } from './scans.service';
import { JwtAuthGuard } from 'src/api/auth/guards/jwt-auth.guard';
import { basename, extname, join } from 'path';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { format } from 'util';
import { parse, format as formatDate } from 'date-fns';
import { AnyFilesInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createWorker, OEM, PSM, Worker } from 'tesseract.js';
import * as sharp from 'sharp';
import * as path from 'path';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import fs from 'fs/promises';    // Promises version for async operations

import * as archiver from 'archiver';
import { promises as fsPromises } from 'fs';
import { interval, map, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ProgressService } from 'src/progress/progress.service';
import { DocumentProcessorService } from './document-processor.service';
import { JobStatus, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { AdminService } from '../admin.service';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { ScanType } from 'src/enums/scan-type.enum';
import { TextParserService } from 'src/api/scans/text-parser.service';
import { RoleEnum } from 'src/enums/role.enum';
import { Role } from 'src/entities/role.entity';
import { Roles } from '../user/dto/roles.decorator';
import { Job } from 'bull';
// import { ProgressService } from '../progress/progress.service';

@UseGuards(AuthenticatedGuard)
@Controller('admin/scans')
export class ScansController {
    private readonly logger = new Logger(ScansController.name);
    constructor(
        private readonly scansService: ScansService, 
        private readonly progressService: ProgressService,
        private readonly textParserService: TextParserService,
        private readonly documentProcessor: DocumentProcessorService,
        private readonly adminService: AdminService,
        @InjectQueue('scan') private readonly scanQueue: Queue,
    ) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @Render('scans/index')
    // @Roles('super_admin', 'admin')
    async getScansPage(@Req() req: Request & { user: User }) {
        const user: User = req.user;

        // if (user && user.roles?.some(role => role.name === 'admin' || role.name === 'super_admin')) {
        //     return {
        //         currentPath: req.path,
        //         title: 'My Scans',
        //     };
        // }

        // throw new ForbiddenException('Access Denied');
        return {
            currentPath: req.path,
            title: 'My Scans',
        };
    }

    // API endpoint for DataTables
    @Get('data')
    @UseGuards(JwtAuthGuard)
    async getScansData(
        @Req() req: Request & { user: User },
        @Query() query: any
    ) {
        try {
            const user: User = req.user;
            let userId = 0;
            if (user && user.roles?.some(role => role.code === 'admin' || role.code === 'super_admin')) {
                userId =  req.user.id;
            }
            console.log({userId})
            // Parse DataTables parameters
            const draw = parseInt(query.draw);
            const start = parseInt(query.start);
            const length = parseInt(query.length);
            const orderColumn = query.order?.[0]?.column;
            const orderDir = query.order?.[0]?.dir;
            const searchNo = req.query['no']?.toString();
            const searchSaleOrder = req.query['saleOrder']?.toString();


            const searchValue = req.query['search[value]']?.toString();
            
            const parsedStartDate = query.startDate
                ? formatDate(parse(query.startDate, 'MMM d, yyyy', new Date()), 'yyyy-MM-dd')
                : undefined;

            const parsedEndDate = query.endDate
                ? formatDate(parse(query.endDate, 'MMM d, yyyy', new Date()), 'yyyy-MM-dd')
                : undefined;

            const parsedInvoiceStartDate = query.invoiceStartDate
                ? formatDate(parse(query.invoiceStartDate, 'MMM d, yyyy', new Date()), 'yyyy-MM-dd')
                : undefined;

            const parsedInvoiceSEndDate = query.invoiceEndDate
                ? formatDate(parse(query.invoiceEndDate, 'MMM d, yyyy', new Date()), 'yyyy-MM-dd')
                : undefined;


            console.log('Search value:', searchValue, parsedStartDate, parsedEndDate);

            const { scans, total } = await this.scansService.findForDataTable(
                userId,
                start,
                length,
                searchValue,
                orderColumn,
                orderDir,
                parsedStartDate,
                parsedEndDate,
                parsedInvoiceStartDate,
                parsedInvoiceSEndDate,
                searchNo,
                searchSaleOrder
            );
            
            return {
                draw,
                recordsTotal: total,
                recordsFiltered: total, 
                data: scans
            };
        } catch (error) {
            console.error(error);
            return {
                error: 'Failed to load scans data'
            };
        }
    }


    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async getScanById(@Param('id') id: string, @Req() req: Request & { user: User }) {
        const scan = await this.scansService.findById(+id);
        if (!scan) {
            throw new NotFoundException(`Scan with ID ${id} not found.`);
        }
        let filename = path.basename(scan.imagePath);
                const croppedPath_ = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
                const croppedPath = existsSync(croppedPath_)
                    ? `/uploads/scans/cropped-${filename}`
                    : null;

        return {
            scan: {
                ...scan,
                croppedPath, 
            },
        };
    }

    @Get('/:id/download')
    @UseGuards(JwtAuthGuard)
    async getDownloadFile(
        @Param('id') id: number,
        @Res({ passthrough: true }) res: Response,
        @Req() req: Request & { user: User },
    ): Promise<StreamableFile> {
        const scan = await this.scansService.findById(id);
        const user = req.user

        console.log({user})

        if (!scan) {
        this.logger.warn(`Download attempt for scan ID ${id}: Scan record not found.`);
            throw new NotFoundException(`Scan with ID ${id} not found.`);
        }

        if (!scan.imagePath) {
        this.logger.warn(`Download attempt for scan ID ${id}: imagePath is missing in the database record.`);
            throw new NotFoundException(`Image path for scan ID ${id} is not available.`);
        }
        const filePath = join(process.cwd(), scan.imagePath);
        if (!existsSync(filePath)) {
            this.logger.error(`Download attempt for scan ID ${id}: File not found at expected path: ${filePath}`);
            throw new NotFoundException('File not found on server.');
        }
        // --- Start: Custom filename generation ---
        const originalFilenameWithExt = basename(scan.imagePath);
        const filenameWithoutExt = basename(originalFilenameWithExt, extname(originalFilenameWithExt));
        const fileExtension = extname(originalFilenameWithExt);

        let filenameParts: string[] = []; // Collect parts to join later

        // 1. Add Username part
        if (user) {
        let usernameForFilename: string = '';
        if (user.username) {
            usernameForFilename = user.username;
        } else if (user.email) {
            usernameForFilename = user.email.split('@')[0]; // Use part before @ for email
        }
        // Sanitize username (replace non-alphanumeric/dot/hyphen with underscore)
        if (usernameForFilename) {
            filenameParts.push(usernameForFilename.replace(/[^a-zA-Z0-9-.]/g, '_'));
        }
        } else {
        this.logger.warn(`Download for scan ID ${id}: User object not available. Cannot add username to filename.`);
        }

        // 2. Add Date part (YYYYMMDD_HHMMSS)
        if (user && user.createdAt) { // Assuming user.date exists on your User entity
            try {
                // Convert to Date object if it's not already (e.g., if from DB as string)
                const dateObj = typeof user.createdAt === 'string' ? new Date(user.createdAt) : user.createdAt;

                // Check if it's a valid date
                if (!isNaN(dateObj.getTime())) {
                    const formattedDate = format(dateObj, 'yyyyMMdd_HHmmss');
                    filenameParts.push(formattedDate);
                } else {
                    this.logger.warn(`Download for scan ID ${id}: user.date is an invalid date: ${user.createdAt}`);
                }
            } catch (error) {
                this.logger.error(`Download for scan ID ${id}: Error formatting user.date (${user.createdAt}): ${error.message}`);
            }
        } else {
            this.logger.warn(`Download for scan ID ${id}: user.date is not available or is empty.`);
        }

        // 3. Add Scan ID part
        filenameParts.push(`scan${scan.id}`);

        // 4. Add original filename without extension
        filenameParts.push(filenameWithoutExt);

        // Join all parts with an underscore
        const customPrefix = filenameParts.join('_');

        const finalFilename = `${customPrefix}${fileExtension}`; // Add the original file extension back
        // --- End: Custom filename generation ---

        res.set({
        'Content-Type': 'application/octet-stream', // Generic binary stream; you might refine this based on file type
        'Content-Disposition': `attachment; filename="${finalFilename}"`, // Forces browser to download with this filename
        });

        const fileStream = createReadStream(filePath);
        return new StreamableFile(fileStream);
    }



    @Post('download-zip')
    async downloadZip(@Body() body: { ids: number[] }, @Res() res: Response) {
        try {
        await this.scansService.createZipFile(body.ids, res);
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    }

    @Post('deleted-scans')
    async downloadScans(@Body() body: { ids: number[] }, @Res() res: Response) {
        try {
        await this.scansService.removeScans(body.ids, res);
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    }

    @Get('add/new')
    @UseGuards(JwtAuthGuard)
    @Render('scans/add')
    async newScansPage(@Req() req: Request) {
        return {
            currentPath: req.path,
            title: 'Create New Scans',
            scanTypes: Object.values(ScanType),
        };
    }


    @Post('upload/new')
    @UseInterceptors(AnyFilesInterceptor({
        storage: diskStorage({
            destination: './uploads/scans',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() =>
                    Math.round(Math.random() * 16).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 1024 * 1024 * 5,
        }
    }))

   @UseGuards(JwtAuthGuard)
    async handleUpload(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('scanType') scanType: string,
        @Req() req: Request & { user: User }
    ) {
        const isPaused = await this.scanQueue.isPaused();
        await this.scanQueue.resume(true);
        if (isPaused) {
            await this.scanQueue.resume();
        }
        const user: User = req.user;
        const normalizedType = (scanType.toUpperCase() || '') as ScanType;
        const isValidScanType = Object.values(ScanType).includes(normalizedType);
        const finalScanType = isValidScanType ? normalizedType : ScanType.GENERAL;

        const results: Array<{ status: string; jobId: string, originalName: string }> = [];

        // Add concurrency control
        const MAX_CONCURRENT_UPLOADS = 50; // Adjust based on your system capacity
        const batchSize = Math.min(files.length, MAX_CONCURRENT_UPLOADS);

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (file) => {
                const imagePath = `/uploads/scans/${file.filename}`;
                // Enhanced job ID with timestamp to ensure uniqueness
                const jobId = `scan-${path.parse(file.filename).name}`;

                try {
                    const process_and_create_scan = await this.scanQueue.add(
                        'process_and_create_scan',
                        {
                            imagePath,
                            originalName: file.originalname,
                            scanType: finalScanType,
                            user: user,
                        },
                        {
                            jobId: jobId,
                        }
                    );

                    console.log({process_and_create_scan})

                    results.push({ status: 'queued', jobId: jobId, originalName: file.originalname });
                } catch (error) {
                    results.push({ 
                        status: 'failed_to_queue', 
                        jobId: jobId, 
                        originalName: file.originalname 
                    });
                    console.error(`Failed to queue file ${file.originalname}:`, error);
                }
            }));
        }

        return {
            message: 'Scans have been queued for processing.',
            results,
            totalQueued: results.filter(r => r.status === 'queued').length,
            totalFailed: results.filter(r => r.status === 'failed_to_queue').length
        };
    }

    @Get('queue/status')
    async getQueueStatus() {
        const isPaused = await this.scanQueue.isPaused();
        const counts = await this.scanQueue.getJobCounts();

        const jobs: Job[] = [
            ...(await this.scanQueue.getWaiting()),
            ...(await this.scanQueue.getActive()),
            ...(await this.scanQueue.getDelayed()),
        ];

        let totalProgress = 0;
        let jobsWithProgress = 0;

        for (const job of jobs) {
            const progress = await job.progress(); // Returns 0–100 or a custom value
            if (typeof progress === 'number') {
                totalProgress += progress;
                jobsWithProgress++;
            }
        }

        const averageProgress = jobsWithProgress > 0 ? totalProgress / jobsWithProgress : 0;

        return {
            status: isPaused ? 'paused' : 'active',
            counts,
            totalJobs: jobs.length,
            averageProgress: Math.round(averageProgress),
            timestamp: new Date().toISOString(),
        };
    }

    @Get('jobs/:jobId/progress')
    @UseGuards(JwtAuthGuard)
    async getJobProgress(
        @Param('jobId') jobId: string,
        @Req() req: Request & { user: User }
    ) {
        const job = await this.scanQueue.getJob(jobId);
        
        if (!job) {
            throw new NotFoundException('Job not found');
        }

        const progress = await job.progress();
        const status = await job.getState();

        // Cache the result for 5 seconds to reduce queue pressure
        const result = {
            jobId,
            progress,
            status,
            isComplete: status === 'completed',
            isFailed: status === 'failed',
            timestamp: Date.now()
        };

        console.log(result);

        return result;
    }

    @Post('queue/clean-all')
        async cleanAllJobs() {
        const fs = require('fs');
        const path = require('path');
        const { promisify } = require('util');
        const unlink = promisify(fs.unlink);

        // 1. Pause the queue
        await this.scanQueue.pause(true);

        // 2. Get all jobs across all states
        const jobTypes: JobStatus[] = ['active', 'waiting', 'delayed', 'completed', 'failed'];
        const allJobs = await Promise.all(
            jobTypes.map(type => this.scanQueue.getJobs([type]))
        ).then(jobs => jobs.flat());

        const deletedFiles = new Set<string>();
        let deletedCount = 0;

        await Promise.all(
            allJobs.map(async (job) => {
            try {
                const jobState = await job.getState(); // get current job state
                const shouldDeleteFiles = jobState !== 'completed';
                console.log({jobState})
                if (shouldDeleteFiles && job?.data?.imagePath) {
                const filePath = path.join(process.cwd(), job.data.imagePath);
                const croppedPath = path.join(
                    path.dirname(filePath),
                    `cropped-${path.basename(filePath)}`
                );

                try {
                    if (fs.existsSync(filePath)) {
                        await unlink(filePath);
                        deletedFiles.add(filePath);
                    }
                    if (fs.existsSync(croppedPath)) {
                        await unlink(croppedPath);
                        deletedFiles.add(croppedPath);
                    }
                } catch (fileErr) {
                    this.logger.error(`Failed to delete files for job ${job.id}`, fileErr);
                    }
                }

                // Remove the job
                await job.remove();
                deletedCount++;
            } catch (jobErr) {
                this.logger.error(`Failed to remove job ${job.id}`, jobErr);
            }
            })
        );

        // 4. Extra cleanup and resume queue
        await this.scanQueue.empty();
        await this.scanQueue.clean(0, 'completed');
        await this.scanQueue.clean(0, 'failed');
        await this.scanQueue.resume();

        return {
            success: true,
            deletedJobs: deletedCount,
            deletedFiles: Array.from(deletedFiles),
            message: `Cleaned ${deletedCount} jobs and ${deletedFiles.size} files (excluding completed files)`,
        };
    }




    // @UseGuards(JwtAuthGuard)
    // async handleUpload(
    //     @UploadedFile() file: Express.Multer.File,
    //     @Body('scanType') scanType: string,
    //     @Req() req: Request & { user: User }
    // ) {
    //     const user: User = req.user;
    //     const normalizedType = scanType?.toUpperCase() as ScanType;

    //     const isValidScanType = Object.values(ScanType).includes(normalizedType);
    //     const finalScanType = isValidScanType ? normalizedType : ScanType.GENERAL;
        
    //     const createScanDto = {
    //         imagePath: `/uploads/scans/${file.filename}`,
    //         scannedText: "",
    //         scanType: finalScanType,
    //     };

    //     const { text, confidence } = await this.documentProcessor.OCRText(createScanDto.imagePath);
    //     if( !text) {
    //         throw new InternalServerErrorException('OCR failed to extract text from the document');
    //     }

    //     createScanDto.scannedText = text;

    //     const scan = await this.scansService.create(createScanDto, user);
    //     if(finalScanType === ScanType.KHB) {
    //         const invoiceData = this.textParserService.extractDocumentFields(text);
    //         if (invoiceData) {     
    //             const {
    //                 route,
    //                 saleOrder,
    //                 warehouse,
    //                 vendorCode,
    //                 vehicleNo,
    //                 effectiveDate,
    //                 invoiceDate,
    //             } = invoiceData;

    //             const toStringOrNull = (val: any): string | null => {
    //                 if (typeof val === 'string') return val;
    //                 if (Array.isArray(val)) return val.join(', ');
    //                 if (val && typeof val === 'object') return JSON.stringify(val);
    //                 return null;
    //             };

    //             const updatedFields = {
    //                 route: toStringOrNull(route),
    //                 saleOrder: toStringOrNull(saleOrder),
    //                 warehouse: toStringOrNull(warehouse),
    //                 vendorCode: toStringOrNull(vendorCode),
    //                 vehicleNo: toStringOrNull(vehicleNo),
    //                 effectiveDate: this.parseDate(typeof effectiveDate === 'string' ? effectiveDate : ''),
    //                 invoiceDate: this.parseDate(typeof invoiceDate === 'string' ? invoiceDate : ''),
    //             };

    //             await this.scansService.update(scan.id, updatedFields);
    //         }
    //     }
        
    //     const setting = await this.adminService.getSetting();

    //     if (setting && setting.is_scan_with_ai) {
    //         await this.addToImageProcessingQueue(scan);
    //     }
        
    //     console.log({user}, {scan})
    //     return scan;
    // }


    private async addToImageProcessingQueue(scan: Scan) {
        try {
            await this.scanQueue.add(
                'remove_bg_and_crop',
                {
                    scanId: scan.id,
                    originalImagePath: scan.imagePath,
                },
                {
                    jobId: `scan-${scan.id}`,
                    removeOnComplete: true,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    timeout: 60_000, // 60 seconds
                },
            );
            console.log(`AI processing job added for scan ID: ${scan.id}`);
        } catch (error) {
            console.error(`Failed to queue AI job for scan ${scan.id}: ${error.message}`);
        }
    }

    

    private  parseDate =  (dateStr: string): Date | null => {
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

    
}


