import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import { CreateTeamDto } from './dto/create-team.dto';

/**
 * TeamsService — Equivale a TeamService de Laravel.
 * Los "Teams" representan el personal de cada almacén (vendedoras, encargados).
 * Cada team member puede tener opcionalmente un User vinculado para acceso al sistema.
 */
@Injectable()
export class TeamsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(warehouseId: string, query: Record<string, string | undefined> = {}) {
    const { page, limit, search } = parsePagination(query);
    const where = {
      warehouseId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { surname: { contains: search, mode: 'insensitive' as const } },
          { dni: { contains: search } },
        ],
      }),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.team.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ surname: 'asc' }, { name: 'asc' }],
        include: {
          user: { select: { id: true, username: true, email: true } },
          _count: { select: { attendances: true, payments: true } },
        },
      }),
      this.db.team.count({ where }),
    ]);

    return paginatedResponse(rows, total, limit);
  }

  async findById(id: string) {
    const team = await this.db.team.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: { select: { id: true, username: true, email: true } },
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        payments: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!team) throw new NotFoundException('Miembro del equipo no encontrado.');
    return team;
  }

  async create(dto: CreateTeamDto) {
    const existing = await this.db.team.findFirst({
      where: { dni: dto.dni, warehouseId: dto.warehouseId, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un miembro del equipo con DNI ${dto.dni} en este almacén.`);
    }
    return this.db.team.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateTeamDto>) {
    await this.findById(id);
    return this.db.team.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.db.team.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** fullName helper — usado por attendance y payments */
  fullName(team: { name: string; surname: string }) {
    return `${team.name} ${team.surname}`;
  }
}
