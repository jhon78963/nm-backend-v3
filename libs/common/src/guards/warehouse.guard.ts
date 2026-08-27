import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * WarehouseGuard — Equivale al middleware WarehouseScope + SEC-010 de Laravel.
 * Verifica que el `warehouseId` en el JWT payload coincide con el
 * header `X-Warehouse-Id` cuando este es requerido, previniendo IDOR.
 *
 * Super Admin puede acceder a cualquier warehouse.
 */
@Injectable()
export class WarehouseGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user: { warehouseId: string; roles: string[] };
      headers: Record<string, string>;
    }>();

    const { user, headers } = request;
    const requestedWarehouse = headers['x-warehouse-id'];

    if (!requestedWarehouse) return true;
    if (user.roles?.includes('Super Admin')) return true;

    if (requestedWarehouse !== user.warehouseId) {
      throw new ForbiddenException(
        'No tienes acceso al almacén especificado.',
      );
    }
    return true;
  }
}
