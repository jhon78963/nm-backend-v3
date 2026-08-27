import type { Prisma } from '@prisma/client';
import type { DatabaseService } from '@app/database';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

const SUPER_ADMIN_ROLE = 'Super Admin';

/**
 * Replica ActionLogVisibility de Laravel: logs visibles por tenant del actor
 * vía warehouse_id o tenant_id del usuario asociado al log.
 */
export async function buildActionLogVisibilityWhere(
  db: DatabaseService,
  actor: AuthenticatedUser,
): Promise<Prisma.UserActionLogWhereInput> {
  const tenantId = actor.tenantId?.trim();
  if (!tenantId) {
    return { id: { equals: '' } };
  }

  const warehouses = await db.warehouse.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const warehouseIds = warehouses.map((w) => w.id);

  const or: Prisma.UserActionLogWhereInput[] = [
    { user: { tenantId } },
  ];

  if (warehouseIds.length > 0) {
    or.unshift({ warehouseId: { in: warehouseIds } });
  }

  return { OR: or };
}

export function actorIsSuperAdmin(actor: AuthenticatedUser): boolean {
  return actor.roles.includes(SUPER_ADMIN_ROLE);
}
