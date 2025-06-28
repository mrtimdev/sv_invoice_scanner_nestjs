// src/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { 
  startOfDay, 
  startOfHour, 
  startOfMonth, 
  subMonths, 
  endOfMonth,
  format,
  subWeeks,
  startOfWeek,
  endOfWeek,
  subQuarters,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  parseISO
} from 'date-fns';
import { ScanReportDto, MonthlyTrendDto } from './dto/report-data.dto';
import { ReportFilterDto } from './dto/filter.dto';
import { Scan } from 'src/api/scans/entities/scan.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Scan)
    private scanRepository: Repository<Scan>,
  ) {}

  private getDateRange(filter: ReportFilterDto) {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();

        if (filter.timeRange === 'today') {
            startDate = startOfDay(now);
        } else if (filter.timeRange === 'week') {
            startDate = startOfWeek(now);
        } else if (filter.timeRange === 'month') {
            startDate = startOfMonth(now);
        } else if (filter.timeRange === 'quarter') {
            startDate = startOfQuarter(now);
        } else if (filter.timeRange === 'year') {
            startDate = startOfYear(now);
        } else if (filter.timeRange === 'custom' && filter.startDate && filter.endDate) {
            startDate = parseISO(filter.startDate);
            endDate = parseISO(filter.endDate);
        } else {
        // Default to current month
            startDate = startOfMonth(now);
        }

        return { startDate, endDate };
    }

    async getScanReports(userId: number, filter?: ReportFilterDto): Promise<ScanReportDto> {
        const { startDate, endDate } = this.getDateRange(filter || {});
        const baseWhere = { user: {id: userId  } };

        const totalScans = await this.scanRepository.count({ 
        where: baseWhere 
        });

        const scansInPeriod = await this.scanRepository.count({
        where: {
            ...baseWhere,
            timestamp: Between(startDate, endDate)
        }
        });

        const todayStart = startOfDay(new Date());
        const scansToday = await this.scanRepository.count({
        where: {
            ...baseWhere,
            timestamp: MoreThanOrEqual(todayStart)
        }
        });

        const hourStart = startOfHour(new Date());
        const scansThisHour = await this.scanRepository.count({
        where: {
            ...baseWhere,
            timestamp: MoreThanOrEqual(hourStart)
        }
        });

        const monthStart = startOfMonth(new Date());
        const scansThisMonth = await this.scanRepository.count({
        where: {
            ...baseWhere,
            timestamp: MoreThanOrEqual(monthStart)
        }
        });

        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
        const lastMonthEnd = startOfMonth(new Date());
        const scansLastMonth = await this.scanRepository.count({
        where: {
            ...baseWhere,
            timestamp: Between(lastMonthStart, lastMonthEnd)
        }
        });

        const monthChange = scansLastMonth > 0 
        ? Math.round(((scansThisMonth - scansLastMonth) / scansLastMonth) * 100)
        : 0;

        return {
            totalScans,
            scansToday,
            scansThisMonth,
            scansInPeriod,
            monthChange,
        };
    }

    async getMonthlyTrendData(userId: number, filter?: ReportFilterDto): Promise<MonthlyTrendDto> {
        const months: string[] = [];
        const values: number[] = [];
        const baseWhere = { user: {id: userId} };

        // If year filter is provided, get data for that year
        if (filter?.year) {
        const year = parseInt(filter.year);
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);

        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);

            const count = await this.scanRepository.count({
            where: {
                ...baseWhere,
                timestamp: Between(monthStart, monthEnd)
            }
            });

            months.push(format(monthStart, 'MMM'));
            values.push(count);
        }
        } else {
        // Default to last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(now, i));
            const monthEnd = endOfMonth(subMonths(now, i));

            const count = await this.scanRepository.count({
            where: {
                ...baseWhere,
                timestamp: Between(monthStart, monthEnd)
            }
            });

            months.push(format(monthStart, 'MMM'));
            values.push(count);
        }
        }

        return { labels: months, values };
    }

    async getRecentActivity(userId: number, filter?: ReportFilterDto): Promise<any[]> {
        const { startDate, endDate } = this.getDateRange(filter || {});
        
        const activities = await this.scanRepository.find({
            where: {
                user: {id: userId},
                timestamp: Between(startDate, endDate)
            },
            order: {
                timestamp: 'DESC'
            },
            take: 5
        });

        return activities.map(scan => ({
            icon: 'file-invoice',
            color: 'blue',
            message: `Scanned invoice #${scan.id}`,
            time: format(scan.timestamp, 'MMM d, h:mm a')
        }));
    }
}