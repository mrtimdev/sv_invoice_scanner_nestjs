import { Controller, Get, Post, Render, Res, UseGuards, Body, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import * as ms from 'ms';
import { AuthService } from 'src/auth/auth.service';
import { LoginDto } from 'src/auth/dto/login.dto';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { RedirectIfAuthenticatedGuard } from 'src/auth/guards/redirect-if-authenticated.guard';

@Controller('admin')
export class AdminController {
    constructor(private authService: AuthService, private readonly configService: ConfigService,) {}
    
    @Get('user/login')
    @UseGuards(RedirectIfAuthenticatedGuard)
    @Render('user/login')
    renderLoginPage() {
        return { 
            layout: false, error: null,
            message: 'Welcome to the Admin Login Page' 
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
    async adminLogin(@Body() loginDto: LoginDto, @Res() res: Response) {

        const token = await this.authService.login(loginDto);
        const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN');

        let maxAgeValue: number;
        const msResult = ms(jwtExpiresIn as any); 
        if (typeof msResult === 'number') {
            maxAgeValue = msResult;
        } else {
            console.error(`Invalid JWT_EXPIRES_IN value: ${jwtExpiresIn}. Falling back to default.`);
            maxAgeValue = 3600000; // 1h
        }

        res.cookie('jwt', token.access_token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'lax',
            maxAge: maxAgeValue, 
        });
        console.log(`Admin login successful for ${loginDto.identifier}. Redirecting to /admin/dashboard`);
        return res.redirect('/admin/dashboard');
    }

    @UseGuards(JwtAuthGuard) 
    @Post('user/logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Res() res: Response) {
        console.log('Logout attempt for user:', req.user ? (req.user as any).email : 'unknown'); 
        
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', 
        });

         return res.redirect('/admin/user/login');
    }

    @Get()
    @UseGuards(AuthenticatedGuard)
    @Render('admin/dashboard')
    renderDashboard(@Req() req: Request) {
        return { currentPath: req.path ,title: 'Admin Dashboard', user: 'Admin User' };
    }
    @Get('dashboard')
    @UseGuards(AuthenticatedGuard)
    @Render('admin/dashboard')
    getDashboard(@Req() req: Request) {
        
    // Example static data. In a real app, this would come from a service/database.
    const totalScannedInvoices = 15234;
    const dailyScannedInvoices = 125;
    const monthlyScannedInvoices = 3450;
    const pendingInvoices = 7;

    const recentActivities = [
      { type: 'scanned', detail: 'Invoice #INV-2025-0105 scanned successfully (ABC Corp)', time: '5 mins ago' },
      { type: 'uploaded', detail: 'New batch of 20 invoices uploaded by User A', time: '30 mins ago' },
      { type: 'error', detail: 'Invoice #INV-2025-0098 failed processing (Missing PO)', time: '2 hours ago' },
      { type: 'scanned', detail: 'Invoice #INV-2025-0104 scanned successfully (XYZ Ltd)', time: 'Yesterday' },
      { type: 'uploaded', detail: 'Single invoice uploaded by User B', time: 'Yesterday' },
    ];

    return {
        currentPath: req.path,
        userName: 'Invoice Admin', // Or dynamically get the logged-in user's name
        message: 'Monitor your invoice scanning operations here.',
        title: 'Invoice Scanner Dashboard', // Title for the browser tab
        totalScannedInvoices,
        dailyScannedInvoices,
        monthlyScannedInvoices,
        pendingInvoices,
        recentActivities,
    };
  }
}
