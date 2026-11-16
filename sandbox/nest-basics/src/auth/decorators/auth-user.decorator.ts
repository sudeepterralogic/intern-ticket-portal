import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

// @AuthUser() gives a controller the logged-in user, so controllers never
// touch `req.user` themselves:
//
//   findAll(@AuthUser() user: AuthenticatedUser) { ... user.id, user.role ... }
//
// JwtAuthGuard (global) checks the token, and JwtStrategy.validate() puts
// the user on request.user. This decorator just reads it back, typed.
export const AuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    // Only happens if @AuthUser() is used on a @Public() route by mistake,
    // because then JwtAuthGuard never ran and nobody set request.user.
    if (!request.user) {
      throw new UnauthorizedException('Please provide a valid token');
    }

    return request.user;
  },
);
