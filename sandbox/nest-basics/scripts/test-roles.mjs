// Role x endpoint test (instead of clicking through Postman).
//
//   npm run test:roles            (backend must be running)
//
// For every endpoint it sends a request as: no token, invalid token,
// expired token, User, Agent, Admin, and checks the result against the
// expected access rules.
//
//   401 -> no/invalid/expired token  (JwtAuthGuard)
//   403 -> logged in, wrong role     (RolesGuard)
//   anything else -> the guards let it through (200, or 400/404 because
//   we send an empty body / id 999999 on purpose so NOTHING is changed)
//
// It creates a temporary Agent and User to log in with, and deletes them at the end.
// The "expired token" needs JWT_SECRET, which `npm run test:roles` loads from .env.

import jwt from 'jsonwebtoken';

const API = process.env.API_URL ?? 'http://localhost:3000/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin@123';

// Columns of the table, in order
const CALLERS = ['None', 'Invalid', 'Expired', 'User', 'Agent', 'Admin'];
const ALL = ['User', 'Agent', 'Admin'];
const PUBLIC = ['None', 'Invalid', 'Expired', ...ALL];

// [method, path, who is allowed]
const ENDPOINTS = [
  ['GET', '/auth/me', ALL],
  ['GET', '/health', PUBLIC],
  ['GET', '/categories', PUBLIC],
  ['GET', '/categories/999999', PUBLIC],
  ['POST', '/categories', ['Admin']],
  ['PATCH', '/categories/999999', ['Admin']],
  ['DELETE', '/categories/999999', ['Admin']],
  ['POST', '/tickets', ['User', 'Admin']],
  ['GET', '/tickets', ALL],
  ['GET', '/tickets/999999', ALL],
  ['PATCH', '/tickets/999999', ['User', 'Admin']],
  ['PATCH', '/tickets/999999/status', ['Agent', 'Admin']],
  ['PATCH', '/tickets/999999/assign', ['Admin']],
  ['DELETE', '/tickets/999999', ['User', 'Admin']],
  ['GET', '/users', ['Admin']],
  ['GET', '/users/999999', ['Admin']],
  ['POST', '/users', ['Admin']],
  ['PUT', '/users/999999', ['Admin']],
  ['PATCH', '/users/999999', ['Admin']],
  ['DELETE', '/users/999999', ['Admin']],
];

async function call(method, path, token, body, cookie) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : method === 'GET' ? undefined : '{}',
  });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.get('set-cookie') ?? '';
  return { status: res.status, data, setCookie };
}

async function login(username, password) {
  const res = await call('POST', '/auth/login', null, { username, password });
  if (res.status !== 200) throw new Error(`Login failed for ${username}: ${res.status} ${JSON.stringify(res.data)}`);
  return res;
}

// "refresh_token=abc; Path=/api/auth; HttpOnly" -> "refresh_token=abc"
const refreshCookieFrom = (setCookie) => setCookie.match(/refresh_token=[^;]*/)?.[0];

// What the row is expected to return, e.g. "401 · 403 · Admin ✅"
function expectedText(allowed) {
  if (allowed === PUBLIC) return 'Public: never 401/403';
  return `401 · 403 · ${allowed.join('/')} ✅`;
}

const tokens = {
  None: null,
  Invalid: 'this.is.not-a-valid-jwt',
  // Correct secret and payload shape, but expired 1 minute ago
  Expired: process.env.JWT_SECRET
    ? jwt.sign({ sub: '1', username: 'admin', role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: -60 })
    : undefined,
};
const tempIds = [];
const expectedUsers = {}; // role -> { id, username } we expect /auth/me to return
let userLogin;

try {
  const adminLogin = await login(ADMIN_USERNAME, ADMIN_PASSWORD);
  tokens.Admin = adminLogin.data.access_token;
  expectedUsers.Admin = { id: adminLogin.data.user.id, username: ADMIN_USERNAME };

  // Temporary Agent + User accounts
  const stamp = Date.now();
  for (const role of ['Agent', 'User']) {
    const username = `roletest_${role.toLowerCase()}_${stamp}`;
    const password = 'RoleTest123';
    const created = await call('POST', '/users', tokens.Admin, {
      name: `Role Test ${role}`,
      username,
      email: `${username}@example.com`,
      password,
      role,
    });
    if (created.status !== 201) throw new Error(`Could not create ${role}: ${JSON.stringify(created.data)}`);
    tempIds.push(created.data.id);
    expectedUsers[role] = { id: created.data.id, username };
    const res = await login(username, password);
    tokens[role] = res.data.access_token;
    if (role === 'User') userLogin = res;
  }

  // ---------- 1. Every endpoint x caller ----------
  const rows = [];
  let checks = 0;
  let failures = 0;

  for (const [method, path, allowed] of ENDPOINTS) {
    const cells = [];
    let rowOk = true;

    for (const caller of CALLERS) {
      if (tokens[caller] === undefined) {
        cells.push('n/a');
        continue;
      }

      const { status } = await call(method, path, tokens[caller]);
      const denied = status === 401 || status === 403;
      const shouldAllow = allowed.includes(caller);
      // Not logged in (no / invalid / expired token) -> 401, wrong role -> 403
      const expectedDeny = ALL.includes(caller) ? 403 : 401;

      const ok = shouldAllow ? !denied : status === expectedDeny;
      checks++;
      if (!ok) {
        failures++;
        rowOk = false;
      }

      const label = denied ? `❌ ${status}` : `✅ ${status}`;
      cells.push(ok ? label : `${label} ⚠️`);
    }

    rows.push(
      `| \`${method} ${path.replace('999999', ':id')}\` | ${cells.join(' | ')} | ${expectedText(allowed)} | ${rowOk ? 'PASS' : '**FAIL**'} |`,
    );
  }

  console.log('### Role × endpoint\n');
  console.log(`| Endpoint | No token | Invalid token | Expired token | User | Agent | Admin | Expected | Result |`);
  console.log(`|---|---|---|---|---|---|---|---|---|`);
  console.log(rows.join('\n'));

  // ---------- 2. GET /auth/me: right person, no password ----------
  console.log('\n### GET /auth/me identity\n');
  console.log('| Caller | Status | id | username | role | Has password field? | Result |');
  console.log('|---|---|---|---|---|---|---|');
  for (const role of ['Admin', 'Agent', 'User']) {
    const { status, data } = await call('GET', '/auth/me', tokens[role]);
    const want = expectedUsers[role];
    const leaksPassword = JSON.stringify(data).toLowerCase().includes('password');
    const ok =
      status === 200 &&
      data.id === want.id &&
      data.username === want.username &&
      data.role === role &&
      !leaksPassword;
    checks++;
    if (!ok) failures++;
    console.log(`| ${role} | ${status} | ${data.id} | ${data.username} | ${data.role} | ${leaksPassword ? 'YES' : 'no'} | ${ok ? 'PASS' : '**FAIL**'} |`);
  }

  // ---------- 3. Public auth endpoints ----------
  // Public = no ACCESS token needed. Refresh must still check the REFRESH token.
  const cookie = refreshCookieFrom(userLogin.setCookie);
  const authChecks = [
    ['POST /auth/login (valid, no access token)', 200, { status: userLogin.status }],
    ['POST /auth/login (empty body)', 400, await call('POST', '/auth/login', null, {})],
    ['POST /auth/login (wrong password)', 401, await call('POST', '/auth/login', null, { username: ADMIN_USERNAME, password: 'wrong-password' })],
    ['POST /auth/refresh (no cookie)', 401, await call('POST', '/auth/refresh')],
    ['POST /auth/refresh (fake cookie)', 401, await call('POST', '/auth/refresh', null, null, 'refresh_token=fake')],
  ];

  // Real cookie works once; the old one is then revoked (rotation)
  const refreshed = await call('POST', '/auth/refresh', null, null, cookie);
  authChecks.push(['POST /auth/refresh (valid cookie)', 200, refreshed]);
  authChecks.push(['POST /auth/refresh (re-using the old, rotated cookie)', 401, await call('POST', '/auth/refresh', null, null, cookie)]);

  console.log('\n### Public auth endpoints\n');
  console.log('| Request | Expected | Actual | Message | Result |');
  console.log('|---|---|---|---|---|');
  for (const [name, expected, res] of authChecks) {
    checks++;
    const ok = res.status === expected;
    if (!ok) failures++;
    const message = Array.isArray(res.data?.message) ? res.data.message.join(', ') : (res.data?.message ?? '');
    console.log(`| ${name} | ${expected} | ${res.status} | ${message} | ${ok ? 'PASS' : '**FAIL**'} |`);
  }

  console.log(
    failures === 0
      ? `\nAll ${checks} checks match the expected rules.`
      : `\n${failures} of ${checks} check(s) did NOT match (marked ⚠️ / FAIL).`,
  );
  if (!tokens.Expired) console.log('Note: JWT_SECRET not set, so the expired-token column was skipped.');
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  // Clean up the temporary accounts (their refresh tokens are deleted with them)
  for (const id of tempIds) {
    await call('DELETE', `/users/${id}`, tokens.Admin).catch(() => undefined);
  }
}
