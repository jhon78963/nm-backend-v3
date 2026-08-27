/** Permisos de administración de tenant — equivalente a AuthorizationServiceProvider en Laravel. */
export const TENANT_ADMIN_PERMISSIONS: readonly string[] = [
  'role.getAll',
  'role.get',
  'role.create',
  'role.update',
  'role.delete',
  'role.syncPermissions',
  'role.permissionsIndex',
  'user.getAll',
  'user.get',
  'user.create',
  'user.update',
  'user.delete',
  'warehouse.getAll',
  'warehouse.get',
  'warehouse.create',
  'warehouse.update',
  'warehouse.delete',
  'tenant.get',
  'audit.getAll',
];

export const SUPER_ADMIN_ROLE = 'Super Admin';
export const ADMIN_ROLE = 'Admin';
