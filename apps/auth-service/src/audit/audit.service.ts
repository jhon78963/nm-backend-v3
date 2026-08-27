import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import { buildActionLogVisibilityWhere } from '@app/common/audit/action-log-visibility.util';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import type { Prisma } from '@prisma/client';

function isValidDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999`);
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async getActionLogs(
    query: Record<string, string | undefined>,
    actor: AuthenticatedUser,
  ) {
    const { page, limit, search } = parsePagination(query);
    const userId = query.user_id ?? query.userId;
    const action = query.action?.trim();
    const actionGroup = (query.action_group ?? query.actionGroup)?.trim();
    const startDate = query.start_date ?? query.startDate;
    const endDate = query.end_date ?? query.endDate;

    const and: Prisma.UserActionLogWhereInput[] = [
      await buildActionLogVisibilityWhere(this.db, actor),
    ];

    if (userId) {
      and.push({ userId });
    }

    if (action) {
      and.push({ action });
    } else if (actionGroup) {
      and.push({ action: { startsWith: `${actionGroup}.` } });
    }

    if (search) {
      const like = search;
      and.push({
        OR: [
          { action: { contains: like, mode: 'insensitive' } },
          { description: { contains: like, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { name: { contains: like, mode: 'insensitive' } },
                { surname: { contains: like, mode: 'insensitive' } },
                { email: { contains: like, mode: 'insensitive' } },
                { username: { contains: like, mode: 'insensitive' } },
              ],
            },
          },
        ],
      });
    }

    if (isValidDate(startDate) || isValidDate(endDate)) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (isValidDate(startDate)) createdAt.gte = startOfDay(startDate!);
      if (isValidDate(endDate)) createdAt.lte = endOfDay(endDate!);
      and.push({ createdAt });
    }

    const where: Prisma.UserActionLogWhereInput = { AND: and };

    const [rows, total] = await this.db.$transaction([
      this.db.userActionLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              teams: {
                take: 1,
                select: { id: true, name: true, surname: true },
              },
            },
          },
        },
      }),
      this.db.userActionLog.count({ where }),
    ]);

    return paginatedResponse(
      rows.map((row) => this.mapRow(row)),
      total,
      limit,
    );
  }

  private mapRow(
    row: {
      id: string;
      createdAt: Date;
      action: string;
      description: string | null;
      metadata: unknown;
      ipAddress: string | null;
      warehouseId: string | null;
      user: {
        id: string;
        name: string;
        surname: string;
        email: string;
        teams: Array<{ id: string; name: string; surname: string }>;
      } | null;
    },
  ) {
    const team = row.user?.teams?.[0];
    const userName = row.user
      ? `${row.user.name ?? ''} ${row.user.surname ?? ''}`.trim()
      : null;

    return {
      id: row.id,
      creationTime: row.createdAt.toISOString(),
      action: row.action,
      description: row.description,
      metadata: row.metadata,
      ipAddress: row.ipAddress,
      warehouseId: row.warehouseId,
      userName,
      user: row.user
        ? {
            id: row.user.id,
            name: userName ?? row.user.name,
            email: row.user.email,
          }
        : null,
      team: team
        ? {
            id: team.id,
            name: `${team.name ?? ''} ${team.surname ?? ''}`.trim(),
          }
        : null,
    };
  }
}
