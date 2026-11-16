# RBAC test results

**Tested:** 15 Nov 2026 · **API:** `http://localhost:3000/api` (NestJS backend in `sandbox/nest-basics`)
**Result:** ✅ 130 / 130 live checks · ✅ 18 / 18 e2e tests · ✅ 4 / 4 unit tests

How the guards and decorators work is explained in [roles-access.md](roles-access.md).
This page is the test evidence.

## The deny-by-default policy

Every request passes two global guards, registered in `AppModule` with `APP_GUARD`.
Nest runs global guards in the order they are registered:

```
request ─▶ 1. JwtAuthGuard ─▶ 2. RolesGuard ─▶ controller
             │                  │
             └ no / bad token   └ wrong role, or route has
               → 401              no @Roles() and no @Public() → 403
```

| What the route has | Who gets in |
|---|---|
| `@Public()` | Everyone. Both guards skip it. The route still validates its own input (login checks the password, refresh checks the refresh token). |
| `@Roles(UserRole.ADMIN, …)` | Only the listed roles. Others get **403**. |
| **Neither** | **No one, not even Admin: 403.** |

**Why deny by default?** If a developer adds a new route and forgets to say who may
use it, the route is **locked**, not open to everyone. A mistake leads to a 403 that
someone notices, never a silent security hole.

JwtAuthGuard runs first, so a request with no valid token always gets **401**
("log in first") before the role check can answer **403** ("you're logged in, but
not allowed").

Role values are the ones stored in the database and in the JWT payload: `Admin`,
`Agent`, `User` (enum `UserRole.ADMIN = 'Admin'`, etc.).

## How to read the results

| Status | Meaning |
|---|---|
| ❌ **401** | Blocked by `JwtAuthGuard`: no token, an invalid token or an expired token |
| ❌ **403** | Blocked by `RolesGuard`: valid token, but this role isn't allowed |
| ✅ **200** | Allowed and succeeded |
| ✅ **400 / 404** | **Allowed:** the request passed both guards. The test sends an empty body or id `999999` on purpose, so nothing in the database changes; the 400 (validation) or 404 (not found) comes from the controller, which only runs after both guards allow the request. |

Callers:

- **Invalid token:** the string `this.is.not-a-valid-jwt`.
- **Expired token:** a correctly signed Admin token that expired one minute ago. So a role
  of `Admin` doesn't help once the token has expired.
- **User / Agent / Admin:** real logins. The test creates a temporary User and Agent and
  deletes them at the end.

## Role × endpoint

**Expected** gives the status for each kind of caller:
`401` for no/invalid/expired token · `403` for a wrong role · ✅ for the roles listed.

| Endpoint | No token | Invalid token | Expired token | User | Agent | Admin | Expected | Result |
|---|---|---|---|---|---|---|---|---|
| `GET /auth/me` | ❌ 401 | ❌ 401 | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 | 401 · 403 · User/Agent/Admin ✅ | PASS |
| `GET /health` | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | Public: never 401/403 | PASS |
| `GET /categories` | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | Public: never 401/403 | PASS |
| `GET /categories/:id` | ✅ 404 | ✅ 404 | ✅ 404 | ✅ 404 | ✅ 404 | ✅ 404 | Public: never 401/403 | PASS |
| `POST /categories` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 400 | 401 · 403 · Admin ✅ | PASS |
| `PATCH /categories/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 404 | 401 · 403 · Admin ✅ | PASS |
| `DELETE /categories/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 404 | 401 · 403 · Admin ✅ | PASS |
| `POST /tickets` | ❌ 401 | ❌ 401 | ❌ 401 | ✅ 400 | ❌ 403 | ✅ 400 | 401 · 403 · User/Admin ✅ | PASS |
| `GET /tickets` | ❌ 401 | ❌ 401 | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 | 401 · 403 · User/Agent/Admin ✅ | PASS |
| `GET /tickets/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ✅ 404 | ✅ 404 | ✅ 404 | 401 · 403 · User/Agent/Admin ✅ | PASS |
| `PATCH /tickets/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ✅ 404 | ❌ 403 | ✅ 404 | 401 · 403 · User/Admin ✅ | PASS |
| `PATCH /tickets/:id/status` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ✅ 400 | ✅ 400 | 401 · 403 · Agent/Admin ✅ | PASS |
| `PATCH /tickets/:id/assign` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 400 | 401 · 403 · Admin ✅ | PASS |
| `DELETE /tickets/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ✅ 404 | ❌ 403 | ✅ 404 | 401 · 403 · User/Admin ✅ | PASS |
| `GET /users` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 200 | 401 · 403 · Admin ✅ | PASS |
| `GET /users/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 404 | 401 · 403 · Admin ✅ | PASS |
| `POST /users` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 400 | 401 · 403 · Admin ✅ | PASS |
| `PUT /users/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 404 | 401 · 403 · Admin ✅ | PASS |
| `PATCH /users/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 404 | 401 · 403 · Admin ✅ | PASS |
| `DELETE /users/:id` | ❌ 401 | ❌ 401 | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 404 | 401 · 403 · Admin ✅ | PASS |

All `/users` routes are Admin-only through one `@Roles(UserRole.ADMIN)` on the
`UsersController` class.

> The role check decides **which kind of user** may call a route. The tickets service
> then checks **which ticket**: a User passes the role check on `PATCH /tickets/:id`,
> but still gets 403 for a ticket someone else created.

## GET /auth/me identity

Each role logs in and calls `/auth/me`. The test checks that the returned `id`,
`username` and `role` belong to the account that logged in, and that the response
has no password field. (User and Agent are the temporary test accounts.)

| Caller | Status | id | username | role | Has password field? | Result |
|---|---|---|---|---|---|---|
| Admin | 200 | 1 | admin | Admin | no | PASS |
| Agent | 200 | 13 | roletest_agent_… | Agent | no | PASS |
| User | 200 | 14 | roletest_user_… | User | no | PASS |

A valid token for a user who has since been **deleted** gets **401 "User no longer
exists"**, not 404 or 500 (e2e test).

## Public auth endpoints

`@Public()` means "no **access** token needed". It does **not** mean "no checks".

| Request | Expected | Actual | Message | Result |
|---|---|---|---|---|
| `POST /auth/login` (valid, no access token) | 200 | 200 | | PASS |
| `POST /auth/login` (empty body) | 400 | 400 | username should not be empty, … | PASS |
| `POST /auth/login` (wrong password) | 401 | 401 | Invalid username or password | PASS |
| `POST /auth/refresh` (no cookie) | 401 | 401 | No refresh token | PASS |
| `POST /auth/refresh` (fake cookie) | 401 | 401 | Invalid refresh token | PASS |
| `POST /auth/refresh` (valid cookie) | 200 | 200 | | PASS |
| `POST /auth/refresh` (re-using the old, rotated cookie) | 401 | 401 | Refresh token has been revoked | PASS |

The refresh route is public but checks the refresh token itself in `AuthService.refresh()`:
the token must exist in the database (stored as a SHA-256 hash), not be revoked and not be
expired, and the user must still be active. Each refresh replaces the token ("rotation").
Reusing an old token is treated as possible theft, and all of that user's sessions are logged out.

## Deny by default: evidence

The real app has **no** route without `@Roles()` or `@Public()` (one would be a bug), so
the live table can't show one. The e2e test boots the **real `AppModule` with both global
guards** and adds a route that exists only inside the test:

```ts
@Get('forgotten')          // no @Roles(), no @Public()
forgotten() { return { reached: true }; }
```

Output of `npx vitest run --config ./vitest.config.e2e.ts`:

```
route with neither @Roles() nor @Public()
  ✓ no token -> 401 (JwtAuthGuard runs first)
  ✓ Admin token -> 403 (no role gets in, not even Admin)
  ✓ Agent token -> 403 (no role gets in, not even Admin)
  ✓ User token -> 403 (no role gets in, not even Admin)
@Roles(UserRole.ADMIN) route
  ✓ Admin -> 200
  ✓ Agent -> 403
  ✓ User -> 403
bad tokens on a protected route (GET /api/users) -> 401
  ✓ garbage token
  ✓ signed with the wrong secret
  ✓ expired token
  ✓ User token edited to say role "Admin" (signature no longer matches)
@Public() routes work without a token
  ✓ GET /api/health -> 200
  ✓ POST /api/auth/login still validates its body -> 400
  ✓ POST /api/auth/refresh without a refresh cookie -> 401
  ✓ POST /api/auth/refresh with a fake refresh cookie -> 401

Tests  15 passed (15)
```

The 403 message for the forgotten route is
`Access denied: this route has no @Roles() or @Public()`.

The "edited token" test matters: a User can't just change `"role": "User"` to
`"Admin"` inside their token, because the signature no longer matches and the request
gets 401.

## Bug found while testing

`PATCH /users/:id` returned **404 "Cannot PATCH"**. `@Put(':id')` and `@Patch(':id')`
were stacked on one method, and Nest registers only one of them. PATCH now has its own
method (same service call, still Admin-only). It is the `PATCH /users/:id` row above.

## Known limitation

A user's role is read from the access token. If an Admin changes someone's role or
deactivates them, their current access token keeps working until it expires (at most
**15 minutes**). After that, the refresh fails ("Your account is inactive") or the new
token carries the new role.

## How to reproduce

```bash
cd sandbox/nest-basics
npm run start:dev                                  # terminal 1
npm run test:roles                                 # terminal 2: prints both tables, exits 1 if any check fails
npx vitest run --config ./vitest.config.e2e.ts     # deny-by-default + bad tokens (needs the DB, not the server)
npx vitest run src/common/guards/roles.guard.spec.ts
```

`test:roles` loads `.env` (for `JWT_SECRET`, which signs the expired test token) and logs
in as `admin` / `admin@123` by default. Override with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
