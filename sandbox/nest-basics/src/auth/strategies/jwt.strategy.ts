import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserRole } from '../../users/user-role.enum.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

// What we put inside the access token in AuthService
export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

// Passport "jwt" strategy:
// 1. reads the token from the header  Authorization: Bearer <token>
// 2. checks the signature with JWT_SECRET and that it has not expired
// 3. calls validate(); whatever it returns becomes request.user
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: Number(payload.sub),
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
