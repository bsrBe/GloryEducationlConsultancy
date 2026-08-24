import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    // Only audit write operations (POST, PATCH, PUT, DELETE)
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Skip audit for certain endpoints
    const skipAudit = ['/api/auth/login', '/api/auth/profile', '/api/messages/unread'];
    if (skipAudit.some(path => url.includes(path))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          const action = `${method} ${url}`;
          const userId = user?._id?.toString();
          const studentId = body?.studentId || this.extractStudentId(url);

          await this.auditService.log(
            userId,
            action,
            studentId,
            {
              method,
              url,
              body: this.sanitizeBody(body),
            },
          );
        } catch (error) {
          // Don't let audit errors break the request
        }
      }),
    );
  }

  private extractStudentId(url: string): string | undefined {
    // Extract student ID from URL patterns like /students/:id/...
    const match = url.match(/\/students\/([a-fA-F0-9]{24})/);
    return match?.[1];
  }

  private sanitizeBody(body: any): Record<string, any> {
    if (!body || typeof body !== 'object') return {};

    const sanitized = { ...body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    return sanitized;
  }
}
