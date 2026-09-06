import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuditService } from './audit/audit.service';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RateLimiterGuard } from './common/guards/rate-limiter.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Health check (before global prefix so it's at GET /)
  app.getHttpAdapter().get('/health', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get audit service for interceptor
  const auditService = app.get(AuditService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global audit interceptor
  app.useGlobalInterceptors(new AuditInterceptor(auditService));

  // Global rate limiter guard (brute force protection)
  app.useGlobalGuards(new RateLimiterGuard());

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 5000;
  await app.listen(port, '0.0.0.0');
  console.log(
    `🚀 Glory Admissions API running on port ${port}/api`,
  );
}
bootstrap();
