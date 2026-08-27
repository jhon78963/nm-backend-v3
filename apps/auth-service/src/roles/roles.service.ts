import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const SUPER_ADMIN_ROLE = 'Super Admin';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(query: Record<string, string | undefined>, actor: AuthenticatedUser) {
    const { page, limit, search } = parsePagination(query);
    const actorIsSuperAdmin = actor.roles.includes(SUPER_ADMIN_ROLE);

    const where: Record<string, unknown> = {};
    if (!actorIsSuperAdmin) {
      where.OR = [{ tenantId: actor.tenantId }, { tenantId: null }];
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [rows, total] = await this.db.$transaction([
      this.db.role.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          permissions: { include: { permission: true } },
        },
      }),
      this.db.role.count({ where }),
    ]);

    return paginatedResponse(rows.map((row) => this.mapRole(row)), total, limit);
  }

  async getOne(id: string) {
    const role = await this.db.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    if (!role) return null;
    return this.mapRole(role);
  }

  async getPermissions() {
    const permissions = await this.db.permission.findMany({
      orderBy: { name: 'asc' },
    });
    return permissions.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }

  async create(data: Record<string, unknown>, actor: AuthenticatedUser) {
    const name = String(data.name ?? '').trim();
    const role = await this.db.role.create({
      data: {
        name,
        tenantId: actor.roles.includes(SUPER_ADMIN_ROLE)
          ? (data.tenantId as string | null | undefined) ?? null
          : actor.tenantId,
      },
    });
    if (Array.isArray(data.permissions)) {
      await this.syncPermissions(role.id, data.permissions as string[]);
    }
    return this.getOne(role.id);
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.db.role.update({
      where: { id },
      data: {
        ...(data.name != null && { name: String(data.name) }),
      },
    });
    if (Array.isArray(data.permissions)) {
      await this.syncPermissions(id, data.permissions as string[]);
    }
    return this.getOne(id);
  }

  async delete(id: string) {
    await this.db.rolePermission.deleteMany({ where: { roleId: id } });
    await this.db.userRole.deleteMany({ where: { roleId: id } });
    await this.db.role.delete({ where: { id } });
    return { message: 'Role deleted successfully.' };
  }

  async syncPermissions(id: string, permissionNames: string[]) {
    await this.syncPermissionsInternal(id, permissionNames);
    const role = await this.getOne(id);
    return { role };
  }

  private async syncPermissionsInternal(roleId: string, names: string[]) {
    const permissions = await this.db.permission.findMany({
      where: { name: { in: names } },
    });
    await this.db.rolePermission.deleteMany({ where: { roleId } });
    if (permissions.length > 0) {
      await this.db.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  private mapRole(
    role: {
      id: string;
      name: string;
      tenantId: string | null;
      permissions?: Array<{ permission: { id: string; name: string } }>;
    },
  ) {
    return {
      id: role.id,
      name: role.name,
      tenantId: role.tenantId,
      permissions: role.permissions?.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
      })),
    };
  }
}
