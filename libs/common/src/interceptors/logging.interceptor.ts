import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FastifyRequest } from 'fastify';

/**
 * LoggingInterceptor — Equivale a LogUserActivity middleware de Laravel.
 * Registra método, ruta y tiempo de respuesta por request autenticado.
 * NO registra el body (para evitar filtrar contraseñas/PII).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, ip } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} — ${ms}ms [${ip}]`);
      }),
    );
  }
}
