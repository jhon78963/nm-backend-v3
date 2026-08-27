import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles('Vendedora', 'Admin') — Equivale a `permission:nombre` de Spatie.
 * Usar junto con RolesGuard.
 *
 * @example
 * @Roles('Admin', 'Super Admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('users')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
