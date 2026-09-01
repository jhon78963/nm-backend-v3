import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { SUPER_ADMIN_ROLE } from '../auth/tenant-admin-permissions';
import { PermissionsResolverService } from '../auth/permissions-resolver.service';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsResolver: PermissionsResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Sin autorización.');
    }

    if (user.roles?.includes(SUPER_ADMIN_ROLE)) {
      return true;
    }

    let userPermissions = user.permissions ?? [];
    if (!userPermissions.length && user.id) {
      userPermissions = await this.permissionsResolver.resolveForUser(
        user.id,
        user.roles ?? [],
      );
      user.permissions = userPermissions;
    }

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de: ${requiredPermissions.join(', ')}.`,
      );
    }

    return true;
  }
}
