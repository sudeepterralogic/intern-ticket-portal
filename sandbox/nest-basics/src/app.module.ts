import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    UsersModule,
    AuthModule,
    TicketsModule,
    CategoriesModule,
    HealthModule,
  ],
  providers: [
    // Global guards run in THIS order for every request:
    // 1. JwtAuthGuard: is there a valid access token?  no -> 401
    //    (skipped for @Public routes)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2. RolesGuard: is the user's role allowed here?  no -> 403
    //    Routes without @Roles() or @Public() -> 403 (deny by default)
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
