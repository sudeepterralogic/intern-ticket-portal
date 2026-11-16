import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import type { TimedRequest } from './common/http-error.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Note the time each request arrives, so the logs can show its duration
  // (even for requests rejected by a guard before the interceptor runs)
  app.use((req: TimedRequest, _res: unknown, next: () => void) => {
    req.startTime = Date.now();
    next();
  });

  // Reads cookies into req.cookies (needed for the refresh_token cookie)
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Same error shape for every error; 500s never leak a stack trace
  app.useGlobalFilters(new AllExceptionsFilter());

  // Log method, URL, status and time in ms for every request
  app.useGlobalInterceptors(new LoggingInterceptor());

  // credentials: true lets the browser send/receive the refresh cookie.
  // With credentials, the origin must be an exact URL (not "*").
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);

  console.log(`Server running at http://localhost:${port}/api`);
}

bootstrap();