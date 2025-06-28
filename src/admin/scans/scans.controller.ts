import { Controller, Get, Logger, NotFoundException, Param, Query, Render, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/api/auth/guards/authenticated.guard';
import { Response, Request } from 'express';
import { User } from 'src/entities/user.entity';
import { ScansService } from './scans.service';
import { JwtAuthGuard } from 'src/api/auth/guards/jwt-auth.guard';
import { basename, extname, join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { format } from 'util';
@UseGuards(AuthenticatedGuard)
@Controller('admin/scans')
export class ScansController {
    private readonly logger = new Logger(ScansController.name);
    constructor(private readonly scansService: ScansService) {}

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
            // const searchValue = query.search?.value;
            // const searchValue = query.search?.value;
            const orderColumn = query.order?.[0]?.column;
            const orderDir = query.order?.[0]?.dir;
            const searchValue = req.query['search[value]']?.toString();
            console.log('Search value:', searchValue);
            const { scans, total } = await this.scansService.findForDataTable(
                userId,
                start,
                length,
                searchValue,
                orderColumn,
                orderDir
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
        return {
            scan: scan 
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
}
