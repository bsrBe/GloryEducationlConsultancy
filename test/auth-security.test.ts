// Run with: npx ts-node test/auth-security.test.ts (needs MONGODB_URI, JWT_SECRET and a seeded database)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
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

  console.log(`FAILED: ${failed}`);
  await app.close();
  process.exit(failed ? 1 : 0);
}
run();
