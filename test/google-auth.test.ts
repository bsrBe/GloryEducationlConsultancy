// Run with: npx ts-node test/google-auth.test.ts (needs MONGODB_URI, JWT_SECRET)
// Google's signature check is replaced for the happy paths; the real check is
// exercised by the "forged token" case. KEEP_OPEN=<port> leaves the API running.
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { AuthService } from '../src/auth/auth.service';
import { RateLimiterGuard } from '../src/common/guards/rate-limiter.guard';

async function run() {
  process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalGuards(new RateLimiterGuard());

  const auth = app.get(AuthService) as any;
  const realDecode = auth.decodeGoogleToken.bind(auth);
  auth.decodeGoogleToken = async (credential: string, audience: string) => {
    if (credential === 'forged.jwt.token') return realDecode(credential, audience);
    return JSON.parse(credential);
  };

  const port = Number(process.env.KEEP_OPEN || 5056);
  await app.listen(port);
  if (process.env.KEEP_OPEN) return;

  const base = `http://127.0.0.1:${port}/api`;
  let failed = 0;
  const check = (ok: boolean, name: string, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` -> ${detail}` : ''}`);
    if (!ok) failed++;
  };
  const post = async (path: string, body: unknown, token?: string) => {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as any };
  };
  const google = (profile: Record<string, unknown>) => post('/auth/google', { credential: JSON.stringify(profile) });
  const get = async (path: string, token: string) => {
    const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
    return { status: res.status, body: (await res.json().catch(() => null)) as any };
  };

  const email = `google${Date.now()}@test.com`;
  const created = await google({ email, email_verified: true, given_name: 'Goo', family_name: 'Gle' });
  check(created.status === 201 && created.body.isNewUser === true, 'new Google user gets an account', String(created.status));
  const id = created.body.user._id;
  const me = await get(`/students/${id}`, created.body.access_token);
  check(me.status === 200 && me.body.firstName === 'Goo' && /^GH26-/.test(me.body.studentId) && me.body.application?.stage === 'Interested', 'account is complete with no phone', me.body.studentId);
  const again = await google({ email: email.toUpperCase(), email_verified: true, given_name: 'Other' });
  check(again.status === 201 && again.body.isNewUser === false && again.body.user._id === id && again.body.user.firstName === 'Goo', 'second sign-in reuses the account');

  const pw = `pw${Date.now()}@test.com`;
  const reg = await post('/auth/register', { email: pw, password: 'secret123', firstName: 'Pass', lastName: 'Word', phone: '1' });
  const linked = await google({ email: pw, email_verified: true, given_name: 'Pass' });
  check(linked.body.user?._id === reg.body.student._id && (await post('/auth/login', { email: pw, password: 'secret123' })).status === 201, 'existing student can use Google and keeps their password');

  const noName = await google({ email: `n${Date.now()}@test.com`, email_verified: true });
  check(noName.status === 201 && noName.body.user.lastName === '-', 'missing name from Google does not break sign-up');
  check((await google({ email: `u${Date.now()}@test.com`, email_verified: false })).status === 401, 'unverified Google email refused');
  check((await google({ email_verified: true })).status === 401, 'token with no email refused');
  const staff = await google({ email: 'admin@gloryedu.com', email_verified: true });
  check(staff.status === 403, 'staff email cannot sign in with Google', staff.body?.message);
  check((await post('/auth/google', {})).status === 400, 'missing credential refused');
  const forged = await post('/auth/google', { credential: 'forged.jwt.token' });
  check(forged.status === 401, 'forged token rejected by real verification', String(forged.status));

  const token = created.body.access_token;
  check((await post('/students/dashboard/delete-account', {}, token)).status === 201, 'student deactivates account');
  check((await get(`/students/${id}`, token)).status === 401, 'deactivated: existing session stops working');
  check((await google({ email, email_verified: true })).status === 401, 'deactivated: Google sign-in refused');
  const dp = (await post('/auth/register', { email: `d${Date.now()}@test.com`, password: 'secret123', firstName: 'D', lastName: 'P', phone: '1' })).body;
  await post('/students/dashboard/delete-account', {}, dp.access_token);
  check((await post('/auth/login', { email: dp.user.email, password: 'secret123' })).status === 401, 'deactivated: password login refused');

  console.log(`FAILED: ${failed}`);
  await app.close();
  process.exit(failed ? 1 : 0);
}
run();
