// Run with: npx ts-node test/auth-security.test.ts (needs MONGODB_URI, JWT_SECRET and a seeded database)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { AuthService } from '../src/auth/auth.service';
import { EmailService } from '../src/email/email.service';
import { Student } from '../src/students/schemas/student.schema';
import { User } from '../src/users/schemas/user.schema';
import { University } from '../src/universities/schemas/university.schema';

async function run() {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const sent: { template: string; to: string; data: any }[] = [];
  const email = app.get(EmailService) as any;
  email.sendTemplateEmail = async (template: string, to: any, data: any) => {
    sent.push({ template, to: to.email, data });
  };
  const lastLink = (template: string, address: string, param = 'token') => {
    const message = [...sent].reverse().find((m) => m.template === template && m.to === address);
    const url = message?.data.resetUrl ?? '';
    return new URL(url, 'http://x').searchParams.get(param) ?? '';
  };

  const students = app.get(getModelToken(Student.name));
  const users = app.get(getModelToken(User.name));
  const universities = app.get(getModelToken(University.name));

  await app.listen(5057);
  const base = 'http://127.0.0.1:5057/api';
  let failed = 0;
  const check = (ok: boolean, name: string, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` -> ${detail}` : ''}`);
    if (!ok) failed++;
  };
  const call = async (path: string, token?: string, method = 'GET', body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, text: await res.clone().text(), body: (await res.json().catch(() => null)) as any };
  };
  const login = async (address: string, password: string) =>
    (await call('/auth/login', undefined, 'POST', { email: address, password })).body?.access_token;

  const admin = await login('admin@gloryedu.com', 'admin123456');
  const address = `sec${Date.now()}@test.com`;
  const reg = (await call('/auth/register', undefined, 'POST', { email: address, password: 'secret123', firstName: 'Sec', lastName: 'Test', phone: '1' })).body;
  const id = reg.student._id;

  check((await call('/auth/forgot-password', undefined, 'POST', { email: address })).status === 201, 'reset requested');
  const raw = lastLink('password_reset_request', address);
  check(raw.length === 64, 'token is long and random', `${raw.length} chars`);

  const stored = await students.findById(id).select('+passwordResetToken +passwordResetExpires').lean();
  check(!!stored.passwordResetToken && stored.passwordResetToken !== raw, 'database holds a hash, not the token');
  const hidden = (text: string) => !text.includes('passwordResetToken') && !text.includes(raw) && !text.includes(stored.passwordResetToken);
  check(hidden((await call(`/students/${id}`, admin)).text), 'token hidden: student record');
  check(hidden((await call(`/students?search=${encodeURIComponent(address)}`, admin)).text), 'token hidden: student list');
  const own = await call(`/students/${id}/profile`, reg.access_token, 'PATCH', { city: 'Nairobi' });
  check(own.status === 200 && hidden(own.text) && !('password' in own.body), 'profile save returns no password hash or token');

  const rep = await users.findOne({ email: 'rep@mit.edu' });
  await call('/auth/forgot-password', undefined, 'POST', { email: 'rep@mit.edu' });
  const repStored = await users.findById(rep._id).select('+passwordResetToken').lean();
  const uni = await universities.findOneAndUpdate({}, { representative: rep._id }, { new: true });
  const list = await call('/universities');
  const linked = list.body.find((u: any) => u._id === uni._id.toString());
  check(linked.representative.firstName === rep.firstName, 'public university list still names the rep');
  check(!list.text.includes(repStored.passwordResetToken) && !list.text.includes('passwordResetToken') && !list.text.includes(rep.email), 'public list hides rep token and email');
  check(!(await call('/users', admin)).text.includes(repStored.passwordResetToken), 'token hidden: staff user list');

  check((await call('/auth/reset-password', undefined, 'POST', { token: stored.passwordResetToken, newPassword: 'hacked123' })).status === 400, 'stolen database hash cannot reset the password');
  check((await call('/auth/reset-password', undefined, 'POST', { token: 'wrong', newPassword: 'hacked123' })).status === 400, 'wrong token refused');
  check((await call('/auth/reset-password', undefined, 'POST', { token: raw, newPassword: 'newsecret1' })).status < 300, 'real token resets the password');
  check(!!(await login(address, 'newsecret1')), 'new password works');
  check(!(await login(address, 'secret123')), 'old password stops working');
  check((await call('/auth/reset-password', undefined, 'POST', { token: raw, newPassword: 'again12345' })).status === 400, 'token cannot be reused');
  const cleared = await students.findById(id).select('+passwordResetToken +passwordResetExpires').lean();
  check(!cleared.passwordResetToken && !cleared.passwordResetExpires, 'token removed from the database');

  await call('/auth/forgot-password', undefined, 'POST', { email: address });
  const expiring = lastLink('password_reset_request', address);
  await students.updateOne({ _id: id }, { passwordResetExpires: new Date(Date.now() - 1000) });
  check((await call('/auth/reset-password', undefined, 'POST', { token: expiring, newPassword: 'late123456' })).status === 400, 'expired token refused');
  check((await call('/auth/forgot-password', undefined, 'POST', { email: 'nobody@example.com' })).status === 201, 'unknown email gets the same response');

  // --- Email verification ---
  const link = (template: string, to: string) => {
    const message = [...sent].reverse().find((m) => m.template === template && m.to === to);
    return new URL(message?.data.verifyUrl ?? 'http://x', 'http://x').searchParams.get('token') ?? '';
  };
  const signUp = async (name: string) => {
    const addr = `${name}${Date.now()}@test.com`;
    return { addr, ...(await call('/auth/register', undefined, 'POST', { email: addr, password: 'attacker123', firstName: 'A', lastName: 'B', phone: '1' })).body };
  };
  const dash = async (t: string) => (await call('/students/dashboard/my', t)).body;

  const a = await signUp('verify');
  const aId = a.student._id;
  const vt = link('registration_confirmation', a.addr);
  check(vt.length === 64, 'welcome email contains a confirmation link');
  check((await dash(a.access_token)).emailVerified === false, 'new password account starts unverified');
  check(!(await call(`/students/${aId}`, admin)).text.includes('emailVerificationToken'), 'confirmation token hidden from records');
  check((await call(`/students/${aId}/profile`, a.access_token, 'PATCH', { city: 'Accra' })).status === 200, 'unverified student can keep using the portal');
  check((await call(`/students/${aId}/profile`, a.access_token, 'PATCH', { emailVerified: true })).status === 400, 'student cannot mark themselves verified');
  check((await call('/auth/verify-email', undefined, 'POST', { token: 'wrong' })).status === 400, 'wrong confirmation link refused');
  check((await call('/auth/resend-verification', a.access_token, 'POST')).status === 429, 'resend is limited to once a minute');
  check((await call('/auth/verify-email', undefined, 'POST', { token: vt })).status < 300, 'confirmation link works');
  check((await dash(a.access_token)).emailVerified === true, 'account now shows as verified');
  check((await call('/auth/verify-email', undefined, 'POST', { token: vt })).status === 400, 'confirmation link cannot be reused');
  check((await call('/auth/resend-verification', a.access_token, 'POST')).status < 300, 'resend on a verified account changes nothing');
  check((await call('/auth/resend-verification', undefined, 'POST')).status === 401, 'resend needs a login');

  const exp = await signUp('expire');
  const et = link('registration_confirmation', exp.addr);
  await students.updateOne({ _id: exp.student._id }, { emailVerificationExpires: new Date(Date.now() - 1000), emailVerificationSentAt: new Date(0) });
  check((await call('/auth/verify-email', undefined, 'POST', { token: et })).status === 400, 'expired link refused');
  check((await call('/auth/resend-verification', exp.access_token, 'POST')).status < 300, 'student can request a new link');
  const nt = link('email_verification', exp.addr);
  check(nt.length === 64 && nt !== et && (await call('/auth/verify-email', undefined, 'POST', { token: nt })).status < 300, 'new link works');

  // The attack: someone pre-registers with another person's email
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  const authService = app.get(AuthService) as any;
  authService.decodeGoogleToken = async (credential: string) => JSON.parse(credential);
  const google = (addr: string) => call('/auth/google', undefined, 'POST', { credential: JSON.stringify({ email: addr, email_verified: true, given_name: 'Real' }) });

  const attack = await signUp('victim');
  await new Promise((r) => setTimeout(r, 1100));
  const owner = await google(attack.addr);
  check(owner.status === 201 && owner.body.user._id === attack.student._id, 'real owner reaches the account with Google');
  check(!(await login(attack.addr, 'attacker123')), 'attacker password stops working');
  check((await call(`/students/${attack.student._id}`, attack.access_token)).status === 401, 'attacker session is ended');
  check((await call(`/students/${attack.student._id}`, owner.body.access_token)).status === 200, 'owner session works immediately');
  check((await dash(owner.body.access_token)).emailVerified === true, 'account is now verified');
  check((await call('/auth/verify-email', undefined, 'POST', { token: link('registration_confirmation', attack.addr) })).status === 400, 'old confirmation link is cancelled');

  const safe = await signUp('safe');
  await call('/auth/verify-email', undefined, 'POST', { token: link('registration_confirmation', safe.addr) });
  await google(safe.addr);
  check(!!(await login(safe.addr, 'attacker123')) && (await call(`/students/${safe.student._id}`, safe.access_token)).status === 200, 'verified account keeps password and session after Google');

  const swap = await signUp('swap');
  await call('/auth/verify-email', undefined, 'POST', { token: link('registration_confirmation', swap.addr) });
  const target = `target${Date.now()}@test.com`;
  const changed = await call(`/students/${swap.student._id}/profile`, swap.access_token, 'PATCH', { email: target });
  check(changed.status === 200 && (await dash(swap.access_token)).emailVerified === false && link('email_verification', target).length === 64, 'changing email makes the account unverified and sends a link');
  check(!(await login(target, 'x')) && (await call(`/students/${swap.student._id}/profile`, swap.access_token, 'PATCH', { email: a.addr })).status === 409, 'cannot switch to an email already in use');
  await new Promise((r) => setTimeout(r, 1100));
  await google(target);
  check(!(await login(target, 'attacker123')), 'email swap does not get around the lockout');

  const old = await signUp('legacy');
  await students.updateOne({ _id: old.student._id }, { $unset: { emailVerified: 1 } });
  check((await dash(old.access_token)).emailVerified === false, 'older accounts count as unverified');
  await call('/auth/forgot-password', undefined, 'POST', { email: old.addr });
  await new Promise((r) => setTimeout(r, 1100));
  const rt = lastLink('password_reset_request', old.addr);
  check((await call('/auth/reset-password', undefined, 'POST', { token: rt, newPassword: 'owner12345' })).status < 300, 'password reset succeeds');
  const fresh = await login(old.addr, 'owner12345');
  check((await dash(fresh)).emailVerified === true, 'password reset also confirms the email');
  check((await call(`/students/${old.student._id}`, old.access_token)).status === 401, 'password reset ends older sessions');

  console.log(`FAILED: ${failed}`);
  await app.close();
  process.exit(failed ? 1 : 0);
}
run();
