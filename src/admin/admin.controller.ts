import { Controller, Get, Post, Render, Res, UseGuards, Body, Req, HttpStatus, HttpCode, Query, BadRequestException, Redirect, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import * as ms from 'ms';
import { AuthService } from 'src/api/auth/auth.service';
import { LoginDto } from 'src/api/auth/dto/login.dto';
import { AuthenticatedGuard } from 'src/api/auth/guards/authenticated.guard';
import { JwtAuthGuard } from 'src/api/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from 'src/api/auth/guards/local-auth.guard';
import { RedirectIfAuthenticatedGuard } from 'src/api/auth/guards/redirect-if-authenticated.guard';
import { ReportService } from './report/report.service';
import { DashboardDataDto } from './report/dto/report-data.dto';
import { User } from 'src/entities/user.entity';
import { ReportFilterDto } from './report/dto/filter.dto';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(
        private authService: AuthService, 
        private readonly configService: ConfigService,
        private readonly reportService: ReportService,
        private readonly adminService: AdminService
    ) {}
    
    @Get('user/login')
    @UseGuards(RedirectIfAuthenticatedGuard)
    @Render('user/login')
    renderLoginPage(@Req() req: Request) {
        return { 
            layout: false,
            message: 'Welcome to the Admin Login Page',
            error: req.query.error,
            identifier: req.query.identifier || ''
        };
    }

    @Get('user/register')
    @Render('user/register')
    renderRegisterPage() {
        return {layout: false, error: null, message: 'Welcome to the Admin register Page' };
    }

    // @UseGuards(AuthGuard('local')) 
    // @UseGuards(LocalAuthGuard)
    @Post('user/login')
    @Header('Content-Type', 'text/plain')
    async adminLogin(@Body() loginDto: LoginDto, @Res() res: Response, @Req() req: Request) {
        try {
            const { access_token, user } = await this.authService.loginOnWebAdmin(loginDto);

            const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN');

            let maxAgeValue: number;
            const msResult = ms(jwtExpiresIn as any); 
            if (typeof msResult === 'number') {
                maxAgeValue = msResult;
            } else {
                console.error(`Invalid JWT_EXPIRES_IN value: ${jwtExpiresIn}. Falling back to default.`);
                maxAgeValue = 3600000; // 1h
            }

            res.cookie('jwt', access_token, {
                httpOnly: true, 
                secure: false,
                sameSite: 'lax',
                maxAge: maxAgeValue, 
            });
            console.warn("updated secure: false")
            console.log(`Admin login successful for ${loginDto.identifier}. Redirecting to /admin/dashboard`);
            return res.redirect('/admin/dashboard');
        } catch (error) {
            let redirectUrl = '/admin/user/login?error=auth_failed';
    
            if (error.message.includes('Credentials required')) {
            redirectUrl = '/admin/user/login?error=missing_credentials';
            }
            
            // Preserve the identifier if available
            if (req.body.identifier) {
            redirectUrl += `&identifier=${encodeURIComponent(req.body.identifier)}`;
            }
            
            return res.redirect(redirectUrl);
        }
        
    }

    @UseGuards(JwtAuthGuard) 
    @Post('user/logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Res() res: Response) {
        console.log('Logout attempt for user:', req.user ? (req.user as any).email : 'unknown'); 
        
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: false,//process.env.NODE_ENV === 'production',
            sameSite: 'lax', 
        });

        return res.redirect('/admin/user/login');
    }

    @Get()
    @UseGuards(AuthenticatedGuard)
    async renderDashboard(@Req() req: Request, @Res() res: Response) {
        return res.redirect('admin/dashboard');
    }

    @Get('dashboard')
    @UseGuards(AuthenticatedGuard, JwtAuthGuard)
    @Render('admin/dashboard')
    async getDashboard(
        @Req() req: Request & { user: User },
        @Query() filter: ReportFilterDto
    ): Promise<DashboardDataDto> {
        const userId = req.user.id;
        
        const reportData = await this.reportService.getScanReports(userId, filter);
        const monthlyTrendData = await this.reportService.getMonthlyTrendData(userId, filter);
        const recentActivity = await this.reportService.getRecentActivity(userId, filter);
        
        return {
            currentPath: req.path,
            totalScannedInvoices: reportData.totalScans.toLocaleString(),
            invoicesScannedToday: reportData.scansToday,
            invoicesScannedThisMonth: reportData.scansThisMonth,
            monthChange: reportData.monthChange,
            monthlyTrendLabels: JSON.stringify(monthlyTrendData.labels),
            monthlyTrendValues: JSON.stringify(monthlyTrendData.values),
            recentActivity: JSON.stringify(recentActivity),
            currentYear: new Date().getFullYear(),
            
        };
    }

    @Get('dashboard/stats')
    @UseGuards(JwtAuthGuard)
    async getStats(
        @Req() req: Request & { user: User },
        @Query() filter: ReportFilterDto
    ) {
        const userId = req.user.id;
        const reportData = await this.reportService.getScanReports(userId, filter);
        
        return {
            totalScannedInvoices: reportData.totalScans.toLocaleString(),
            invoicesScannedToday: reportData.scansToday,
            invoicesScannedThisMonth: reportData.scansThisMonth,
            monthChange: reportData.monthChange,
        };
    }

    @Get('dashboard/chart-data')
    @UseGuards(JwtAuthGuard)
    async getChartData(
        @Req() req: Request & { user: User },
        @Query() filter: ReportFilterDto
    ) {
        const userId = req.user.id;
        return this.reportService.getMonthlyTrendData(userId, filter);
    }

    @Get('dashboard/recent-activity')
    @UseGuards(JwtAuthGuard)
    async getRecentActivity(
        @Req() req: Request & { user: User },
        @Query() filter: ReportFilterDto
    ) {
        const userId = req.user.id;
        return this.reportService.getRecentActivity(userId, filter);
    }



    @Get('settings')
    @Render('admin/settings')
    async getSettingsPage(@Req() req: Request) {
        const setting = await this.adminService.getSetting();
        return { currentPath: req.path, setting };
    }
    @Post('settings/update')
    @Redirect('/admin/settings')
    async updateSettings(@Body() body: any) {
        const is_scan_with_ai = body.is_scan_with_ai === 'on';
        const description = body.description || '';

        await this.adminService.updateSetting({
            is_scan_with_ai,
            description,
        });
    }


    // api handle request
    @Get('/settings/api')
    async getSettingsApi(@Res() res: Response) {
        const setting = await this.adminService.getSetting();
        return res.status(200).json({ success: true, setting });
    }
    @Post('settings/api/update')
    async updateSettingApi(@Body() body: any, @Req() req: Request, @Res() res: Response) {
        const is_scan_with_ai = body.is_scan_with_ai === 'on' || body.is_scan_with_ai === true;
        const description = body.description || '';

        await this.adminService.updateSetting({
            is_scan_with_ai,
            description,
        });

        const acceptHeader = req.headers['accept'] || '';
        const isFlutter = acceptHeader.toString().includes('application/json');

        if (isFlutter) {
            // ✅ For Flutter or API clients
            return res.status(200).json({ success: true, message: 'Settings updated successfully.' });
        } else {
            // ✅ For Web (HTML form)
            return res.redirect('/admin/settings');
        }
    }
}
