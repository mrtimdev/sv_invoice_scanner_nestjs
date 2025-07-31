import { Body, Controller, Get, Header, HttpException, HttpStatus, Logger, NotFoundException, Param, Post, Query, Render, Req, Res, Sse, StreamableFile, UploadedFile, UseGuards, UseInterceptors, Headers, InternalServerErrorException  } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/api/auth/guards/authenticated.guard';
import { Response, Request } from 'express';
import { User } from 'src/entities/user.entity';
import { ScansService } from './scans.service';
import { JwtAuthGuard } from 'src/api/auth/guards/jwt-auth.guard';
import { basename, extname, join } from 'path';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { format } from 'util';
import { parse, format as formatDate } from 'date-fns';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { AdminService } from '../admin.service';
import { Scan } from 'src/api/scans/entities/scan.entity';
import { ScanType } from 'src/enums/scan-type.enum';
import { TextParserService } from 'src/api/scans/text-parser.service';
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
    async getScansPage(@Req() req: Request & { user: User }) {
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
            const userId = req.user.id;
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
        };
    }


    @Post('upload/new')
    @UseInterceptors(FileInterceptor('image', {
        storage: diskStorage({
            destination: './uploads/scans',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => 
                    Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
                return cb(new Error('Only image and PDF files are allowed!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 1024 * 1024 * 5 // 5MB
        }
    }))
    


    // async handleUpload(@UploadedFile() file: Express.Multer.File) {
    //     return this.documentProcessor.processDocument(file);
    // }

    @UseGuards(JwtAuthGuard)
    async handleUpload(
        @UploadedFile() file: Express.Multer.File,
        @Body('scanType') scanType: string,
        @Req() req: Request & { user: User }
    ) {
        const user: User = req.user;
        const normalizedType = scanType?.toUpperCase() as ScanType;

        const isValidScanType = Object.values(ScanType).includes(normalizedType);
        const finalScanType = isValidScanType ? normalizedType : ScanType.GENERAL;
        
        const createScanDto = {
            imagePath: `/uploads/scans/${file.filename}`,
            scannedText: "",
            scanType: finalScanType,
        };

        const { text, confidence } = await this.documentProcessor.OCRText(createScanDto.imagePath);
        if( !text) {
            throw new InternalServerErrorException('OCR failed to extract text from the document');
        }

        createScanDto.scannedText = text;

        const scan = await this.scansService.create(createScanDto, user);
        if(finalScanType === ScanType.KHB) {
            const invoiceData = this.textParserService.extractDocumentFields(text);
            if (invoiceData) {     
                const {
                    route,
                    saleOrder,
                    warehouse,
                    vendorCode,
                    vehicleNo,
                    effectiveDate,
                    invoiceDate,
                } = invoiceData;

                const toStringOrNull = (val: any): string | null => {
                    if (typeof val === 'string') return val;
                    if (Array.isArray(val)) return val.join(', ');
                    if (val && typeof val === 'object') return JSON.stringify(val);
                    return null;
                };

                const updatedFields = {
                    route: toStringOrNull(route),
                    saleOrder: toStringOrNull(saleOrder),
                    warehouse: toStringOrNull(warehouse),
                    vendorCode: toStringOrNull(vendorCode),
                    vehicleNo: toStringOrNull(vehicleNo),
                    effectiveDate: this.parseDate(typeof effectiveDate === 'string' ? effectiveDate : ''),
                    invoiceDate: this.parseDate(typeof invoiceDate === 'string' ? invoiceDate : ''),
                };

                await this.scansService.update(scan.id, updatedFields);
            }
        }
        
        const setting = await this.adminService.getSetting();

        if (setting && setting.is_scan_with_ai) {
            await this.addToImageProcessingQueue(scan);
        }
        
        console.log({user}, {scan})
        return scan;
    }


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


