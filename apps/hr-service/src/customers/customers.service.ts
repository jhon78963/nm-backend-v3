import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import { mapCustomerInput, mapCustomerResponse } from './customer.mapper';
import { UpdateCustomerDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

/**
 * CustomersService — Equivale a CustomerService de Laravel.
 * Los clientes son locales a cada warehouse (scoped).
 */
@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(warehouseId: string, query: Record<string, string | undefined> = {}) {
    const { page, limit, search } = parsePagination(query);
    const where = {
      warehouseId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { documentNumber: { contains: search } },
        ],
      }),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.db.customer.count({ where }),
    ]);

    return paginatedResponse(rows.map(mapCustomerResponse), total, limit);
  }

  async findById(id: string) {
    const customer = await this.db.customer.findFirst({
      where: { id, isDeleted: false },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    return mapCustomerResponse(customer);
  }

  async create(dto: UpsertCustomerDto, warehouseId: string) {
    const customer = await this.db.customer.create({
      data: {
        ...mapCustomerInput(dto),
        warehouseId,
      },
    });
    return {
      message: 'Cliente creado correctamente.',
      data: mapCustomerResponse(customer),
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.db.customer.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Cliente no encontrado.');

    const current = mapCustomerResponse(existing);
    const merged = {
      dni: dto.dni ?? current.dni,
      name: dto.name ?? current.name,
      surname: dto.surname ?? current.surname,
    };

    await this.db.customer.update({
      where: { id },
      data: mapCustomerInput(merged),
    });

    return { message: 'Cliente actualizado correctamente.' };
  }

  async remove(id: string) {
    await this.findById(id);
    await this.db.customer.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** Búsqueda rápida para el POS */
  async searchForPos(query: string, warehouseId: string) {
    const rows = await this.db.customer.findMany({
      where: {
        warehouseId,
        isDeleted: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { documentNumber: { contains: query } },
        ],
      },
      take: 10,
    });
    return rows.map(mapCustomerResponse);
  }
}
