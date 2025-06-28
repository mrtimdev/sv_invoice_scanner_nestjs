import { Controller, Get, Render, Req } from '@nestjs/common';
import { ReportService } from './report.service';
import { User } from 'src/entities/user.entity';

@Controller('report')
export class ReportController {

    constructor(private readonly reportService: ReportService) {}

  @Get()
  @Render('reports/index')
  async getReports(@Req() req: Request & { user: User }) {
        const reportData = await this.reportService.getScanReports(req.user.id);
        return reportData;
    }
}
