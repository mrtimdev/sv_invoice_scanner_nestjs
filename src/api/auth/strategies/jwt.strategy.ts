import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      jwtFromRequest: ExtractJwt.fromExtractors([ // Check multiple locations for JWT
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Standard for Authorization: Bearer <token>
        (req) => { // Custom extractor for JWT from cookies
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['jwt']; // Assuming your cookie name is 'jwt'
          }
          return token;
        },
      ]),
      
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallbackSecret', // Ensure this is never undefined
      algorithms: ['HS256'],
    });
  }

  async validate(payload: { sub: number; username: string }) {
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      native_name: user.nativeName,
      roles: user.roles,
      created_at: user.createdAt,
    };
  }
}