import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import { mapVendorInput, mapVendorResponse } from './vendor.mapper';
import { UpdateVendorDto, UpsertVendorDto } from './dto/upsert-vendor.dto';

/**
 * VendorsService — Equivale a VendorService de Laravel.
 * Los proveedores son locales a cada warehouse (scoped por warehouseId).
 * Soporta búsqueda por nombre, dirección, teléfono.
 */
@Injectable()
export class VendorsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(warehouseId: string, query: Record<string, string | undefined> = {}) {
    const { page, limit, search } = parsePagination(query);
    const where = {
      warehouseId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
          { address: { contains: search, mode: 'insensitive' as const } },
          { local: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.vendor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.db.vendor.count({ where }),
    ]);

    return paginatedResponse(rows.map(mapVendorResponse), total, limit);
  }

  async findById(id: string) {
    const vendor = await this.db.vendor.findFirst({
      where: { id, isDeleted: false },
    });
    if (!vendor) throw new NotFoundException('Proveedor no encontrado.');
    return mapVendorResponse(vendor);
  }

  async create(dto: UpsertVendorDto, warehouseId: string) {
    const vendor = await this.db.vendor.create({
      data: {
        ...mapVendorInput(dto),
        warehouseId,
      },
    });

    return {
      message: 'Proveedor creado correctamente.',
      data: mapVendorResponse(vendor),
    };
  }

  async update(id: string, dto: UpdateVendorDto) {
    const existing = await this.db.vendor.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Proveedor no encontrado.');

    const current = mapVendorResponse(existing);
    const merged = {
      name: dto.name ?? current.name,
      address: dto.address ?? current.address,
      local: dto.local ?? current.local,
      phone: dto.phone ?? current.phone,
    };

    await this.db.vendor.update({
      where: { id },
      data: mapVendorInput(merged),
    });

    return { message: 'Proveedor actualizado correctamente.' };
  }

  async remove(id: string) {
    await this.findById(id);
    await this.db.vendor.update({ where: { id }, data: { isDeleted: true } });
  }
}
