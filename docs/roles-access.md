# Role-based access (deny by default)

Every request to the API passes two global guards, in this order:

| Step | Guard | Question | If "no" |
|---|---|---|---|
| 1 | `JwtAuthGuard` | Is there a valid access token? | **401 Unauthorized** |
| 2 | `RolesGuard` | Is the user's role allowed on this route? | **403 Forbidden** |

Routes marked `@Public()` skip both checks.

## The rule: deny by default

Each route must say who can use it:

| Decorator on the route | Result |
|---|---|
| `@Public()` | Anyone, no login needed |
| `@Roles(UserRole.ADMIN, ...)` | Only those roles. Everyone else gets 403 |
| **Neither** | **403 for everyone, even Admin** |

So if someone adds a new route and forgets to decide who can use it, the route is
locked rather than open to everyone.

```ts
@Public()                              // anyone
@Get('health') check() {}

@Roles(UserRole.ADMIN)                 // admin only
@Delete(':id') remove() {}

@Get('oops') forgotten() {}            // no decorator -> 403 for everyone
```

`@Roles()` on a controller class applies to all its routes (see `UsersController`).

## Public routes

| Route | Why public |
|---|---|
| `POST /api/auth/login` | You don't have a token yet |
| `POST /api/auth/refresh` | Your access token has expired; uses the refresh cookie |
| `POST /api/auth/logout` | Must work even with an expired access token |

`GET /api/auth/me` is **not** public (any logged-in role). That's why `@Public()` is
on each auth method, not on the `AuthController` class.
| `GET /api/health` | For monitoring; reports API + database status |
| `GET /api/categories`, `GET /api/categories/:id` | Category list is not secret |

## Role × endpoint results

The full table (no token, invalid token, expired token, User, Agent, Admin for every
endpoint) and the test evidence are in [rbac-test-results.md](rbac-test-results.md).

### Roles and tickets: two layers

The role check decides **which kind of user** may call a route. The tickets service
then checks **which ticket**:

- **User** sees, edits and deletes only tickets they created.
- **Agent** sees tickets assigned to them and changes their status.
- **Admin** can do everything.

So a User passes the role check on `PATCH /tickets/:id`, but still gets 403 for
someone else's ticket.

## How to test

```bash
cd sandbox/nest-basics
npm run start:dev        # terminal 1
npm run test:roles       # terminal 2: prints the role x endpoint table, fails if any rule breaks
npx vitest run --config ./vitest.config.e2e.ts         # e2e: deny-by-default through the real guards
npx vitest run src/common/guards/roles.guard.spec.ts   # unit test, incl. deny-by-default
```
