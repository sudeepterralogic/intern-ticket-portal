import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

// Registered GLOBALLY in AppModule (APP_GUARD), so it protects every route.
// Uses JwtStrategy ('jwt') to check the access token.
// Routes marked @Public() are skipped.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  // Called by Passport with the result of JwtStrategy.validate()
  handleRequest<TUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const expired =
        info instanceof Error && info.name === 'TokenExpiredError';

      throw new UnauthorizedException(
        expired
          ? 'Access token expired'
          : info instanceof Error && info.message === 'No auth token'
            ? 'Please provide a valid token'
            : 'Invalid or expired token',
      );
    }

    return user;
  }
}
