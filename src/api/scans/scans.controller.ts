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
import * as path from 'path';
import { join } from 'path';
import { existsSync } from 'fs';
import * as fs from 'fs';
import { CreateScanDto } from './dto/create-scan.dto';

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
        const user: User = req.user;
        const normalizedType = scanType?.toUpperCase() as ScanType;

        const isValidScanType = Object.values(ScanType).includes(normalizedType);
        const finalScanType = isValidScanType ? normalizedType : ScanType.GENERAL;
        const imagePath = `/uploads/scans/${file.filename}`;
        
        // const jobId = `scan-${path.parse(file.filename).name}`;

        // const process_and_create_scan = await this.scanQueue.add(
        //     'process_and_create_scan',
        //     {
        //         imagePath,
        //         originalName: file.originalname,
        //         scanType: finalScanType,
        //         user: user,
        //     },
        //     {
        //         jobId: jobId,
        //     }
        // );

        // console.log("Scanning from mobile...!")

        // const setting = await this.adminService.getSetting();
   
        // if (setting && setting.is_scan_with_ai) {
        //     await this.scanQueue.resume(true);
            
        //     await this.addingToAutoCroppedProcessingQueue(scan);
        // }
        // return scan;
        

        if (!text) {
            const filePath = join(process.cwd(), imagePath);
            const filename = path.basename(imagePath);
            const croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
            const errorDir = join(process.cwd(), 'uploads', 'error-scans');

            if (!existsSync(errorDir)) {
                await fs.promises.mkdir(errorDir, { recursive: true });
            }

            const errorFilePath = join(errorDir, filename);
            const errorCroppedPath = join(errorDir, `cropped-${filename}`);

            if (existsSync(filePath)) {
                await fs.promises.rename(filePath, errorFilePath);
            }

            if (existsSync(croppedPath)) {
                await fs.promises.rename(croppedPath, errorCroppedPath);
            }

            console.table(`OCR failed for file ${filename}, moved to error-scans.`)

            return {
                success: false,
                message: `OCR failed. File moved to error-scans: ${filename}`,
            };
        } else {
            const createScanDto: CreateScanDto = {
                imagePath: imagePath,
                scannedText: text,
                scanType: finalScanType,
                originalName: file.originalname
            };
            const scan = await this.scanService.create(createScanDto, req.user);
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
            
            const setting = await this.adminService.getSetting();
   
            if (setting && setting.is_scan_with_ai) {
                await this.scanQueue.resume(true);
                
                await this.addingToAutoCroppedProcessingQueue(scan);
            }
            return scan;
        }
    }


    private async addingToAutoCroppedProcessingQueue(scan: Scan) {
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
                    attempts: 0,
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