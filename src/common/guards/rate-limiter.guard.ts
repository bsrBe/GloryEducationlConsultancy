import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const WINDOW_MS = 60 * 1000; // all limits are per 1 minute

// Students on a shared school or office network count as one IP, so the general
// limit is generous. Routes that check a password or are costly are stricter.
const GENERAL_PER_IP = 600;
const SIGN_UP_PER_IP = 60;
const CREDENTIALS_PER_IP = 60;
const CREDENTIALS_PER_ACCOUNT = 10;

const CREDENTIAL_PATHS = [
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/verify-email',
  '/api/auth/reset-password',
];
const SIGN_UP_PATHS = ['/api/auth/register', '/api/auth/google'];

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private static hits = new Map<string, RateLimitRecord>();
  private static nextCleanup = 0;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    // req.ip follows the TRUST_PROXY setting in main.ts
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    this.removeExpired(now);

    this.count(`all:${ip}`, GENERAL_PER_IP, now, res);

    if (req.method === 'POST' && SIGN_UP_PATHS.includes(req.path)) {
      this.count(`signup:${ip}`, SIGN_UP_PER_IP, now, res);
    }

    if (req.method === 'POST' && CREDENTIAL_PATHS.includes(req.path)) {
      this.count(`credentials:${ip}`, CREDENTIALS_PER_IP, now, res);
      const email = (req.body as { email?: unknown })?.email;
      if (typeof email === 'string') {
        const account = email.trim().toLowerCase();
        this.count(
          `account:${ip}:${account}`,
          CREDENTIALS_PER_ACCOUNT,
          now,
          res,
        );
      }
    }

    return true;
  }

  private count(key: string, max: number, now: number, res: Response) {
    const record = RateLimiterGuard.hits.get(key);

    if (!record || now > record.resetTime) {
      RateLimiterGuard.hits.set(key, { count: 1, resetTime: now + WINDOW_MS });
      return;
    }

    if (record.count >= max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again after a minute.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
  }

  private removeExpired(now: number) {
    if (now < RateLimiterGuard.nextCleanup) return;
    RateLimiterGuard.nextCleanup = now + WINDOW_MS;
    for (const [key, record] of RateLimiterGuard.hits) {
      if (now > record.resetTime) RateLimiterGuard.hits.delete(key);
    }
  }
}
