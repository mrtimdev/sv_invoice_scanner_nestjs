import { Controller, Get, NotFoundException, Param, Render, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from './api/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from './api/auth/guards/local-auth.guard';
import { AuthenticatedGuard } from './api/auth/guards/authenticated.guard';
import { User } from './entities/user.entity';

// @UseGuards(AuthenticatedGuard)

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
    @UseGuards(AuthenticatedGuard)
    async renderDashboard_(@Req() req: Request, @Res() res: Response) {
        return res.redirect('admin/dashboard');
    }

  @Get('dashboard')
  @UseGuards(AuthenticatedGuard)
  renderDashboard(@Req() req: Request, @Res() res: Response) {
    return res.redirect('admin/dashboard');
  }

  // @UseGuards(JwtAuthGuard)
  @Get('/uploads/scans/:filename')
  async getFile(
      @Param('filename') filename: string,
      @Res() res: Response
  ) {
    res.sendFile(filename, {
      root: './uploads/scans'
    });
  }

  @Get('/api/scanned/upload/file/:filename')
  getFile_(@Param('filename') filename: string, @Res({ passthrough: true }) res: Response): StreamableFile {
    const filePath = join(process.cwd(), 'uploads', 'scans', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream);
  }
}
