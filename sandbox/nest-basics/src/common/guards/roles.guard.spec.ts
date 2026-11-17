import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { UserRole } from '../../users/user-role.enum.js';

// A fake controller with one route for each case
class TestController {
  @Public()
  publicRoute() {}

  @Roles(UserRole.ADMIN)
  adminRoute() {}

  @Roles(UserRole.ADMIN, UserRole.AGENT)
  staffRoute() {}

  // No @Roles and no @Public -> must be denied
  forgottenRoute() {}
}

// Builds the ExecutionContext Nest would pass to the guard
function contextFor(
  method: keyof TestController,
  role?: UserRole,
): ExecutionContext {
  return {
    getHandler: () => TestController.prototype[method],
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (deny by default)', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows @Public() routes for everyone, even with no user', () => {
    expect(guard.canActivate(contextFor('publicRoute'))).toBe(true);
  });

  it('allows a user whose role is in @Roles()', () => {
    expect(guard.canActivate(contextFor('adminRoute', UserRole.ADMIN))).toBe(true);
    expect(guard.canActivate(contextFor('staffRoute', UserRole.AGENT))).toBe(true);
  });

  it('returns 403 when the role is not in @Roles()', () => {
    expect(() => guard.canActivate(contextFor('adminRoute', UserRole.USER))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(contextFor('adminRoute', UserRole.AGENT))).toThrow(
      ForbiddenException,
    );
  });

  it('returns 403 for a route with no @Roles() and no @Public(), even for ADMIN', () => {
    for (const role of [UserRole.ADMIN, UserRole.AGENT, UserRole.USER]) {
      expect(() => guard.canActivate(contextFor('forgottenRoute', role))).toThrow(
        'Access denied: this route has no @Roles() or @Public()',
      );
    }
  });
});
