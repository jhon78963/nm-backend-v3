import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

/** Rutas públicas del gateway (equivalente a public_api.php en Laravel). */
const PUBLIC_AUTH_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
]);

/**
 * JwtAuthGuard del gateway: permite login/refresh sin token y exige JWT en el resto.
 * Las rutas @Public() del auth-service no aplican aquí — el gateway valida antes de proxificar.
 */
/** Archivos servidos por storage (avatares, productos, etc.) — <img> no envía JWT. */
function isPublicStorageFileRequest(method: string, path: string): boolean {
  return ['GET', 'HEAD'].includes(method) && path.startsWith('/api/v1/storage/files/');
}

@Injectable()
export class GatewayAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ url?: string; method?: string }>();
    const path = (req.url ?? '').split('?')[0];
    const method = (req.method ?? 'GET').toUpperCase();

    if (PUBLIC_AUTH_PATHS.has(path) || isPublicStorageFileRequest(method, path)) {
      return true;
    }
    return super.canActivate(context);
  }
}
