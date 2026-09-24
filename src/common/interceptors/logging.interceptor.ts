import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HEADERS } from '../constants';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;
    const correlationId =
      req.headers[HEADERS.CORRELATION_ID] ||
      req.headers[HEADERS.REQUEST_ID] ||
      (req as any).correlationId ||
      'n/a';
    const applicationId = body?.applicationId || req.headers[HEADERS.APPLICATION_ID] || 'n/a';
    const tenantId = body?.tenantId || req.headers[HEADERS.TENANT_ID] || 'n/a';
    const userId = body?.userId || req.headers[HEADERS.USER_ID] || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const res = context.switchToHttp().getResponse();
          const latencyMs = Date.now() - now;
          this.logger.log({
            message: `[${method}] ${url} - ${res.statusCode} (${latencyMs}ms)`,
            requestId: correlationId,
            applicationId,
            tenantId,
            userId,
            latencyMs,
            statusCode: res.statusCode,
            cacheHit: data?.cached ?? false,
          });
        },
        error: (err) => {
          const latencyMs = Date.now() - now;
          this.logger.error({
            message: `[${method}] ${url} - FAILED (${latencyMs}ms): ${err.message}`,
            requestId: correlationId,
            applicationId,
            tenantId,
            userId,
            latencyMs,
            error: err.name || 'Error',
          });
        },
      }),
    );
  }
}
