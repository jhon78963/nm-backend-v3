import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const SUPER_ADMIN_ROLE = 'Super Admin';

@Injectable()
export class WarehousesService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(
    query: Record<string, string | undefined>,
    actor: AuthenticatedUser,
  ) {
    const { page, limit, search } = parsePagination(query);
    const tenantFilter = query.tenant_id ?? query.tenantId;

    const where: Record<string, unknown> = { isDeleted: false };
    if (!actor.roles.includes(SUPER_ADMIN_ROLE)) {
      where.tenantId = actor.tenantId;
    } else if (tenantFilter) {
      where.tenantId = tenantFilter;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [rows, total] = await this.db.$transaction([
      this.db.warehouse.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.db.warehouse.count({ where }),
    ]);

    return paginatedResponse(
      rows.map((w) => ({
        id: w.id,
        name: w.name,
        tenantId: w.tenantId,
      })),
      total,
      limit,
    );
  }

  async getOne(id: string) {
    const warehouse = await this.db.warehouse.findFirst({
      where: { id, isDeleted: false },
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado.');
    return {
      id: warehouse.id,
      name: warehouse.name,
      tenantId: warehouse.tenantId,
    };
  }

  async create(data: Record<string, unknown>, actor: AuthenticatedUser) {
    const name = String(data.name ?? '').trim();
    const tenantId = actor.roles.includes(SUPER_ADMIN_ROLE)
      ? String(data.tenantId ?? actor.tenantId)
      : actor.tenantId;

    await this.db.warehouse.create({
      data: { name, tenantId },
    });
    return { message: 'Warehouse created successfully.' };
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.db.warehouse.update({
      where: { id },
      data: {
        ...(data.name != null && { name: String(data.name) }),
      },
    });
    return { message: 'Warehouse updated successfully.' };
  }

  async delete(id: string) {
    await this.db.warehouse.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { message: 'Warehouse deleted successfully.' };
  }
}
