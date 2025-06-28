import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User, UserResponse } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    // auth.service.ts
    async validateUser(identifier: string, password: string): Promise<any> {
        console.log(`Attempting login with identifier: ${identifier}`);
        
        const isEmail = identifier.includes('@');
        const user = isEmail
            ? await this.usersService.findByEmail(identifier)
            : await this.usersService.findByUsername(identifier);

        if (!user) {
            console.log('User not found');
            return null;
        }

        console.log(`Found user: ${JSON.stringify(user)}`);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('Invalid password');
            return null;
        }

        const { password: _, ...result } = user;
        return result;
    }

    async login(loginDto: LoginDto) {
        // Check if identifier is email or username
        const isEmail = loginDto.identifier.includes('@');
        
        const user = isEmail
        ? await this.usersService.findByEmail(loginDto.identifier)
        : await this.usersService.findByUsername(loginDto.identifier);

        console.log({isEmail, user})
        if (!user) {
        throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { 
            sub: user.id,
            username: user.username,
            email: user.email,
            roles: user.roles
        };
        
        return {
            success: true,
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles
            }
        };
    }

    async register(registerDto: RegisterDto) {
        const newUser = await this.usersService.register(registerDto);
        const { password, ...result } = newUser;
        return result;
    }


    async validateToken(token: string): Promise<any> {
        try {
            return this.jwtService.verify(token);
        } catch (e) {
            return null;
        }
    }
}