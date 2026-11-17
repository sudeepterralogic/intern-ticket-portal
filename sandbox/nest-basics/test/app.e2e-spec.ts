import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

import { AppModule } from './../src/app.module.js';
import { Roles } from './../src/common/decorators/roles.decorator.js';
import { UserRole } from './../src/users/user-role.enum.js';

// RBAC end-to-end test: the REAL AppModule with BOTH global guards
// (JwtAuthGuard -> RolesGuard), no mocks.
//
// The app has no route without @Roles()/@Public() (that would be a bug),
// so this test adds one that exists only here, to prove it is denied.
@Controller('rbac-probe')
class RbacProbeController {
  // Forgot to decide who can use it -> must be 403 for everyone
  @Get('forgotten')
  forgotten() {
    return { reached: true };
  }

  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { reached: true };
  }
}

describe('RBAC: deny by default (e2e)', () => {
  let app: INestApplication<App>;
  let secret: string;

  // Same payload shape AuthService puts in a real access token
  const tokenFor = (role: UserRole, options: jwt.SignOptions = {}, key = secret) =>
    jwt.sign({ sub: '1', username: `test_${role}`, role }, key, {
      expiresIn: '5m',
      ...options,
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [RbacProbeController],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same setup as main.ts
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    secret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET');
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  describe('route with neither @Roles() nor @Public()', () => {
    it('no token -> 401 (JwtAuthGuard runs first)', async () => {
      await get('/api/rbac-probe/forgotten').expect(401);
    });

    it.each([UserRole.ADMIN, UserRole.AGENT, UserRole.USER])(
      '%s token -> 403 (no role gets in, not even Admin)',
      async (role) => {
        const res = await get('/api/rbac-probe/forgotten', tokenFor(role)).expect(403);
        expect(res.body.message).toBe(
          'Access denied: this route has no @Roles() or @Public()',
        );
      },
    );
  });

  describe('@Roles(UserRole.ADMIN) route', () => {
    it('Admin -> 200', async () => {
      await get('/api/rbac-probe/admin-only', tokenFor(UserRole.ADMIN)).expect(200);
    });

    it.each([UserRole.AGENT, UserRole.USER])('%s -> 403', async (role) => {
      await get('/api/rbac-probe/admin-only', tokenFor(role)).expect(403);
    });
  });

  describe('bad tokens on a protected route (GET /api/users) -> 401', () => {
    it('garbage token', async () => {
      await get('/api/users', 'not-a-jwt').expect(401);
    });

    it('signed with the wrong secret', async () => {
      await get('/api/users', tokenFor(UserRole.ADMIN, {}, 'wrong-secret')).expect(401);
    });

    it('expired token', async () => {
      const expired = tokenFor(UserRole.ADMIN, { expiresIn: -60 });
      const res = await get('/api/users', expired).expect(401);
      expect(res.body.message).toBe('Access token expired');
    });

    it('User token edited to say role "Admin" (signature no longer matches)', async () => {
      const [header, , signature] = tokenFor(UserRole.USER).split('.');
      const fakePayload = Buffer.from(
        JSON.stringify({ sub: '1', username: 'hacker', role: 'Admin' }),
      ).toString('base64url');
      await get('/api/users', `${header}.${fakePayload}.${signature}`).expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('no token -> 401', async () => {
      await get('/api/auth/me').expect(401);
    });

    it('expired token -> 401', async () => {
      await get('/api/auth/me', tokenFor(UserRole.ADMIN, { expiresIn: -60 })).expect(401);
    });

    it('valid token for a user that was deleted -> 401, not 404 or 500', async () => {
      const ghost = jwt.sign({ sub: '999999999', username: 'ghost', role: 'User' }, secret, {
        expiresIn: '5m',
      });
      const res = await get('/api/auth/me', ghost).expect(401);
      expect(res.body.message).toBe('User no longer exists');
    });
  });

  describe('@Public() routes work without a token', () => {
    it('GET /api/health -> 200', async () => {
      await get('/api/health').expect(200);
    });

    it('POST /api/auth/login still validates its body -> 400', async () => {
      await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(400);
    });

    it('POST /api/auth/refresh without a refresh cookie -> 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
      expect(res.body.message).toBe('No refresh token');
    });

    it('POST /api/auth/refresh with a fake refresh cookie -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=fake-token')
        .expect(401);
      // The refresh route is public, but AuthService still checks the token
      expect(res.body.message).toBe('Invalid refresh token');
    });
  });
});
