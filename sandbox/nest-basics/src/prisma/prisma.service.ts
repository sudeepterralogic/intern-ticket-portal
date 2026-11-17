
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaMariaDb({
      host: configService.get<string>('DATABASE_HOST', 'localhost'),
      port: Number(configService.get('DATABASE_PORT', 3306)),
      user: configService.get<string>('DATABASE_USER', 'root'),
      password: configService.get<string>('DATABASE_PASSWORD', 'admin'),
      database: configService.get<string>(
        'DATABASE_NAME',
        'ticket_management',
      ),

      allowPublicKeyRetrieval: true,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
