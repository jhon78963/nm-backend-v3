import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — Equivale al middleware `permission:...` de Spatie en Laravel.
 * Lee los roles del JWT payload (ya populados por JwtStrategy@validate)
 * y verifica que el usuario tenga al menos uno de los roles requeridos.
 *
 * Super Admin bypass: el rol 'Super Admin' tiene acceso total.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{
      user: { roles: string[] };
    }>();

    if (!user?.roles) throw new ForbiddenException('Sin autorización.');

    // Super Admin bypass (equivale a `$user->hasRole('Super Admin')` en Spatie)
    if (user.roles.includes('Super Admin')) return true;

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de: ${requiredRoles.join(', ')}.`,
      );
    }
    return true;
  }
}
