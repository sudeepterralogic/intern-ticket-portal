import { Global, Module } from '@nestjs/common';

// JwtAuthGuard and RolesGuard are registered globally in AppModule (APP_GUARD).
@Global()
@Module({})
export class CommonModule {}
