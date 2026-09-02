import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private static ipHits = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number = 60; // 60 requests
  private readonly windowMs: number = 60 * 1000; // per 1 minute

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const now = Date.now();
    const record = RateLimiterGuard.ipHits.get(ip);

    if (!record || now > record.resetTime) {
      RateLimiterGuard.ipHits.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
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
    return true;
  }
}
