import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { logRequest, toHttpError, type TimedRequest } from '../http-error.js';

// Logs method, URL, status and time in ms for every request
// that reaches a controller, e.g.
//   [HTTP] POST /api/users 201 - 84ms
//   [HTTP] GET /api/users/999 404 - 6ms
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<TimedRequest>();
    const response = http.getResponse<Response>();

    request.startTime ??= Date.now();

    return next.handle().pipe(
      // Success: the status code is already set on the response
      tap(() => logRequest(request, response.statusCode)),

      // Error: work out the status the filter will send, log it, re-throw
      catchError((error: unknown) => {
        logRequest(request, toHttpError(error).statusCode);
        return throwError(() => error);
      }),
    );
  }
}
