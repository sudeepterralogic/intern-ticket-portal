import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { logRequest, toHttpError, type TimedRequest } from '../http-error.js';

// Every error response from the API has exactly this shape.
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  method: string;
  timestamp: string;
}

// Catches EVERY error thrown anywhere in the app (no argument to @Catch).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<TimedRequest>();
    const response = ctx.getResponse<Response>();

    // Maps Nest errors, Prisma P2002 -> 409, P2025 -> 404, anything else -> 500
    const { statusCode, message } = toHttpError(exception);

    if (statusCode >= 500) {
      // Full details (with stack) go to the server log ONLY.
      // The client just gets "Internal server error".
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Requests stopped by a guard (401/403) or unknown routes (404) never reach
    // the LoggingInterceptor, so log them here. logRequest() never logs twice.
    logRequest(request, statusCode);

    const payload: ErrorResponse = {
      statusCode,
      error: this.statusText(statusCode),
      message,
      path: request.originalUrl,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(payload);
  }

  // 409 -> "Conflict", 404 -> "Not Found", 500 -> "Internal Server Error"
  private statusText(statusCode: number): string {
    const name = HttpStatus[statusCode];
    if (!name) return 'Error';
    return name
      .split('_')
      .map((word) => word[0] + word.slice(1).toLowerCase())
      .join(' ');
  }
}
