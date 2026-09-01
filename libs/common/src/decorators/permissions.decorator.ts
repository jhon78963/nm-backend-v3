import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @Permissions('report.sales') — Equivale a `permission:report.sales` de Spatie.
 * Usar junto con PermissionsGuard.
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
