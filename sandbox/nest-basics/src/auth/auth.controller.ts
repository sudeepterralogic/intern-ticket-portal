import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './decorators/public.decorator.js';
import { AuthUser } from './decorators/auth-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';

export const REFRESH_COOKIE = 'refresh_token';

// login / refresh / logout are @Public(): you call them when you DON'T have
// a valid access token yet (login), or when it has expired (refresh/logout).
// They are marked one by one (not on the class) so that GET /auth/me
// is NOT public: it needs a valid access token.
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    this.cookieOptions = {
      httpOnly: true, // JavaScript in the browser can NOT read it (stops XSS theft)
      secure: configService.get('NODE_ENV') === 'production', // HTTPS only in production
      sameSite: 'lax',
      path: '/api/auth', // the browser only sends it to /api/auth/* routes
    };
  }

  // POST /api/auth/login -> 200 + access token, refresh token in cookie
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    return this.sendTokens(res, result);
  }

  // POST /api/auth/refresh -> 200 + NEW access token (reads the cookie)
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.refresh(req.cookies?.[REFRESH_COOKIE]);
      return this.sendTokens(res, result);
    } catch (error) {
      // Bad/expired cookie: remove it so the browser stops sending it
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions);
      throw error;
    }
  }

  // POST /api/auth/logout -> revoke the refresh token + clear the cookie
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions);
    return result;
  }

  // GET /api/auth/me -> the logged-in user's details, fresh from the database.
  // Any role; no/invalid/expired token -> 401 from JwtAuthGuard.
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.USER)
  me(@AuthUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  // Puts the refresh token in the cookie; returns only the access token + user
  private sendTokens(res: Response, result: AuthResult) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions,
      expires: result.refreshExpiresAt,
    });

    return {
      access_token: result.accessToken,
      user: result.user,
    };
  }
}
