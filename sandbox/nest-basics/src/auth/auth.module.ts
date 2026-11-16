import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { SharedJwtModule } from './jwt.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule,
    SharedJwtModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
