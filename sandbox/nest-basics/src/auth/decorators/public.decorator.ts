import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// JwtAuthGuard is global, so EVERY route needs a valid access token by default.
// Put @Public() on a route (or controller) that must work without logging in,
// e.g. login, refresh, logout.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
