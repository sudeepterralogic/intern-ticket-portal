import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UserRole } from '../users/user-role.enum.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

// The user fields we return to the frontend (never the password)
type SafeUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
};

// What login() and refresh() give back to the controller
export interface AuthResult {
  accessToken: string;
  refreshToken: string; // the controller puts this in the HttpOnly cookie
  refreshExpiresAt: Date;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  private readonly refreshDays: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.refreshDays = Number(configService.get('JWT_REFRESH_EXPIRES_DAYS', 7));
  }

  // Register normal users
  async register(dto: CreateUserDto) {
    const user = await this.usersService.create({
      ...dto,
      role: UserRole.USER,
    });

    return {
      message: 'Registration successful',
      user,
    };
  }

  // POST /auth/login
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByUsernameForAuth(dto.username);

    // Same message for "no such user" and "wrong password",
    // so nobody can find out which usernames exist.
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // bcrypt check: compare the typed password with the saved hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is inactive');
    }

    return this.issueTokens(user);
  }

  // POST /auth/refresh
  // Checks the refresh token from the cookie and gives a NEW access token.
  // The old refresh token is revoked and replaced ("rotation").
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const saved = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
      include: { user: true },
    });

    if (!saved) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // A token that was already used/logged out is being used again.
    // That can mean it was stolen, so log this user out everywhere.
    if (saved.revokedAt) {
      await this.revokeAllForUser(saved.userId);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (saved.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!saved.user.isActive) {
      throw new UnauthorizedException('Your account is inactive');
    }

    // Rotation: revoke the old one, then issue a fresh pair
    await this.prisma.refreshToken.update({
      where: { id: saved.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(saved.user);
  }

  // POST /auth/logout: revoke the refresh token (if there is one)
  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hash(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logged out successfully' };
  }

  // GET /auth/me
  // Reuses UsersService.findOne(), which selects only public fields
  // (never the password hash). The token can outlive the account, so:
  //   user deleted     -> 401 (the session is no longer valid)
  //   user deactivated -> 401 (same rule as login and refresh)
  async getProfile(userId: number) {
    try {
      const user = await this.usersService.findOne(userId);

      if (!user.isActive) {
        throw new UnauthorizedException('Your account is inactive');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('User no longer exists');
      }
      throw error;
    }
  }

  // ---------- helpers ----------

  // Creates a short-lived access token (JWT) + a long-lived refresh token.
  // Only the HASH of the refresh token is saved in refresh_tokens.
  private async issueTokens(user: SafeUser): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      username: user.username,
      role: user.role as UserRole,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Refresh token = 64 random bytes (not a JWT). Impossible to guess.
    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + this.refreshDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(refreshToken),
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  // SHA-256 is enough here because the token is long and random
  // (bcrypt is for short, guessable things like passwords).
  // It also lets us look the token up directly by its hash.
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeAllForUser(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
