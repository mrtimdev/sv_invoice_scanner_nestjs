import { Controller, Post, UseGuards, Body, HttpStatus, HttpCode, UnauthorizedException, Get, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';

@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Get('csrf-token')
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    res.json({ csrfToken: req.csrfToken() });
  }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        if (!loginDto.identifier || !loginDto.password) {
        throw new UnauthorizedException('Identifier and password are required');
        }
        return this.authService.login(loginDto);
    }

    @UseGuards(JwtAuthGuard) 
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Res() res: Response) {
        console.log('Logout attempt for user:', req.user ? (req.user as any).email : 'unknown'); 

        res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', 
        });

        return { message: 'Logged out successfully' };
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@Req() req): any {
        return req.user;
    }
}
