import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request } from 'express';

// Request with the extra fields we add for logging
export type TimedRequest = Request & {
  startTime?: number; // set in main.ts when the request arrives
  logged?: boolean; // true once the request has been logged
};

export interface HttpErrorInfo {
  statusCode: number;
  message: string | string[];
}

// Turns ANY thrown error into a status code + safe message.
// Used by both the exception filter and the logging interceptor,
// so they always agree on the status.
export function toHttpError(exception: unknown): HttpErrorInfo {
  // Nest errors: 400, 401, 403, 404, 409 ...
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ??
          exception.message);
    return { statusCode: exception.getStatus(), message };
  }

  // Prisma errors
  const code =
    exception && typeof exception === 'object' && 'code' in exception
      ? (exception as { code: unknown }).code
      : undefined;

  if (code === 'P2002') {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: 'A record with this value already exists',
    };
  }

  if (code === 'P2025') {
    return { statusCode: HttpStatus.NOT_FOUND, message: 'Record not found' };
  }

  // Anything else is a bug -> generic 500, never the real error text
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  };
}

const httpLogger = new Logger('HTTP');

// Logs one line per request, e.g.  GET /api/users 200 - 12ms
// Only logs once, even if called from both the interceptor and the filter.
export function logRequest(request: TimedRequest, statusCode: number) {
  if (request.logged) return;
  request.logged = true;

  const ms = Date.now() - (request.startTime ?? Date.now());
  const line = `${request.method} ${request.originalUrl} ${statusCode} - ${ms}ms`;

  if (statusCode >= 500) httpLogger.error(line);
  else if (statusCode >= 400) httpLogger.warn(line);
  else httpLogger.log(line);
}
