import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import { UserRole } from '../../users/user-role.enum.js';

// GLOBAL guard (registered in AppModule), runs AFTER JwtAuthGuard.
//
// DENY BY DEFAULT:
//   @Public()            -> allowed for everyone (no login needed)
//   @Roles(A, B)         -> allowed only if the user's role is A or B
//   neither decorator    -> 403 for everyone (someone forgot to decide)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Look on the method first, then on the controller class
    const targets = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      targets,
    );
    if (!roles || roles.length === 0) {
      throw new ForbiddenException(
        'Access denied: this route has no @Roles() or @Public()',
      );
    }

    const user = context.switchToHttp().getRequest().user as
      | { role?: UserRole }
      | undefined;

    if (!user?.role || !roles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied: requires role ${roles.join(' or ')}`,
      );
    }

    return true;
  }
}
