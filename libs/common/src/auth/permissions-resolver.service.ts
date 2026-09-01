import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  ADMIN_ROLE,
  SUPER_ADMIN_ROLE,
  TENANT_ADMIN_PERMISSIONS,
} from './tenant-admin-permissions';

@Injectable()
export class PermissionsResolverService {
  constructor(private readonly db: DatabaseService) {}

  async resolveForUser(userId: string, roleNames: string[]): Promise<string[]> {
    const rows = await this.db.rolePermission.findMany({
      where: {
        role: { userRoles: { some: { userId } } },
      },
      include: { permission: { select: { name: true } } },
    });

    const names = new Set(rows.map((row) => row.permission.name));

    if (roleNames.includes(SUPER_ADMIN_ROLE)) {
      const all = await this.db.permission.findMany({
        select: { name: true },
      });
      for (const permission of all) {
        names.add(permission.name);
      }
    } else if (roleNames.includes(ADMIN_ROLE)) {
      for (const permission of TENANT_ADMIN_PERMISSIONS) {
        names.add(permission);
      }
    }

    return [...names].sort();
  }
}
