import { Module } from '@nestjs/common';

import { SharedJwtModule } from '../auth/jwt.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [
    PrismaModule,
    SharedJwtModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}