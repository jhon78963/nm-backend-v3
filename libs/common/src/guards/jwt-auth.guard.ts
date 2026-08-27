import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard — Equivale al grupo middleware `auth:sanctum` + `access-api` de Laravel.
 * Respeta la marca @Public() para rutas públicas (login, refresh, forgot-password).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        err?.message ?? 'No autenticado. Proporciona un token válido.',
      );
    }
    return user;
  }
}
