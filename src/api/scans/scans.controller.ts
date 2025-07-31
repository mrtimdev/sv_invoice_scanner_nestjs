// scans.controller.ts
import { 
  Controller, 
  Post, 
  Delete, 
  Param, 
  UseGuards, 
  Req,
  HttpCode,
  HttpStatus,
  UploadedFile, 
  UseInterceptors,
  Get,
  Body,
  Res,
  Query,
  Logger
} from '@nestjs/common';
import { ScansService } from './scans.service';
import { Request, Response } from 'express';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScanInterceptor } from './interceptors/scan.interceptor';
import { TextParserService } from './text-parser.service';
import { AdminService } from 'src/admin/admin.service';
import { ScanType } from 'src/enums/scan-type.enum';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Scan } from './entities/scan.entity';

@ApiTags('scans')
@ApiBearerAuth()
@Controller('api/scans')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ScanInterceptor)
export class ScansController {
    constructor(private readonly scanService: ScansService, 
        private readonly textParserService: TextParserService,
        private readonly adminService: AdminService,
        @InjectQueue('scan') private readonly scanQueue: Queue,
    ) {}


    @Get()
    @ApiOperation({ summary: 'Paginated scans with filters' })
    async findAll(
        @Req() req: Request & { user: User },
        @Query('limit') limit = 20,
        @Query('before') before?: string,
        @Query('after') after?: string,
        @Query('search') search?: string,
        @Query('filter') filter?: string,
        ) {
        return await this.scanService.paginatedForUser(
            req.user.id,
            +limit,
            before,
            after,
            search,
            filter,
        );
    }


    @Post()
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

    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            file: {
            type: 'string',
            format: 'binary',
            },
            text: { type: 'string' },
        },
        },
    })
    @ApiOperation({ summary: 'Upload a new scan' })
    @ApiConsumes('multipart/form-data')
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body('text') text: string,
        @Body('scanType') scanType: string,
        @Req() req: Request & { user: User }
    ) {
        
        const normalizedType = scanType?.toUpperCase() as ScanType;

        const isValidScanType = Object.values(ScanType).includes(normalizedType);
        const finalScanType = isValidScanType ? normalizedType : ScanType.GENERAL;
        const createScanDto = {
            imagePath: `/uploads/scans/${file.filename}`,
            scannedText: text,
            scanType: finalScanType,
        };

        const scan = await this.scanService.create(createScanDto, req.user);
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

                await this.scanService.update(scan.id, updatedFields);

                const codes = this.textParserService.extractCodesWithContext(text);
                const extractNoSectionValues = this.textParserService.extractNoSectionValues(text);
                // console.log({invoiceData, codes, extractNoSectionValues});
            }
        }
        
        const logger = new Logger('ScanController');
        
        const setting = await this.adminService.getSetting();
        // console.log({finalScanType});
        // if (setting && setting.is_scan_with_ai) {
        //     await this.scanService.removeBackgroundAndAutoCrop(file, scan.imagePath);
        //     console.log('AI Scan is enabled. Background removal and autocrop applied.');
        // }

        if (setting && setting.is_scan_with_ai) {
            await this.addToImageProcessingQueue(scan);
            // await this.scanQueue.add('remove-bg', {
            //     file: {
            //         filename: file.filename,
            //         path: file.path,
            //         mimetype: file.mimetype,
            //     },
            //     imagePath: scan.imagePath,
            // }, {
            //     attempts: 3,
            //     backoff: 5000, // retry after 5s on failure
            // });
            // await this.addToImageProcessingQueue(scan);
            // // Add job to the queue
            // await this.imageProcessingQueue.add(
            //     'remove_bg_and_crop', // Job name (can have multiple job types in one queue)
            //     {
            //         scanId: scan.id,
            //         originalImagePath: scan.imagePath,
            //     },
            //     {
            //         jobId: `scan-${scan.id}`,
            //         removeOnComplete: true,
            //         removeOnFail: false,
            //         attempts: 3, // Retry up to 3 times on failure
            //         backoff: {
            //             type: 'exponential', // Exponential backoff for retries
            //             delay: 5000, // 5 seconds initial delay
            //         },
            //         timeout: 60000, // Job will fail if it takes longer than 60 seconds
            //     }
            // );
            // console.log('AI Scan processing job added to queue.');
        }

        
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

    @Get('file/:filename')
    async getFile(
        @Param('filename') filename: string,
        @Res() res: Response
    ) {
        res.sendFile(filename, {
            root: './uploads/scans'
        });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a scan' })
    async delete(
        @Param('id') id: string,
        @Req() req: Request & { user: User }
    ) {
        await this.scanService.delete(+id, req.user.id);
    }
}