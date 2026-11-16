import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { SharedJwtModule } from '../auth/jwt.module.js';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    PrismaModule,
    SharedJwtModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}