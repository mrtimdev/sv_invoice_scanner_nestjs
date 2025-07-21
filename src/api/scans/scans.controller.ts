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
  Query
} from '@nestjs/common';
import { ScansService } from './scans.service';
import { Request, Response } from 'express';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScanInterceptor } from './interceptors/scan.interceptor';

@ApiTags('scans')
@ApiBearerAuth()
@Controller('api/scans')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ScanInterceptor)
export class ScansController {
    constructor(private readonly scanService: ScansService) {}


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
    @ApiOperation({ summary: 'Upload a new scan' })
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body('text') text: string,
        @Req() req: Request & { user: User }
    ) {
        const createScanDto = {
        imagePath: `/uploads/scans/${file.filename}`,
        scannedText: text
        };
        
        return this.scanService.create(createScanDto, req.user);
    }

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