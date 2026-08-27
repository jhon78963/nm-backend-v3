import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import {
  mapCustomerInput,
  mapCustomerResponse,
  mapPosCustomerResponse,
} from './customer.mapper';
import { DocumentLookupService } from './document-lookup.service';
import { UpdateCustomerDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

/**
 * CustomersService — Equivale a CustomerService de Laravel.
 * Los clientes son locales a cada warehouse (scoped).
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly documentLookup: DocumentLookupService,
  ) {}

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

  /**
   * Búsqueda para POS — equivale a CustomerService::findOrCreateByDoc() de Laravel.
   * 1. Busca en BD local por documento exacto.
   * 2. Si no existe, consulta apis.net.pe (RENIEC/SUNAT) y crea el cliente.
   */
  async searchForPos(query: string, warehouseId: string) {
    const docNumber = query.trim();

    if (!/^\d{8}$|^\d{11}$/.test(docNumber)) {
      throw new NotFoundException({
        success: false,
        code: 'DOC_NOT_FOUND',
        message:
          'El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos numéricos.',
      });
    }

    const localCustomer = await this.db.customer.findFirst({
      where: {
        warehouseId,
        isDeleted: false,
        documentNumber: docNumber,
      },
    });

    if (localCustomer) {
      return mapPosCustomerResponse(localCustomer);
    }

    const lookup = await this.documentLookup.lookupDocument(docNumber);

    const created = await this.db.customer.create({
      data: {
        documentType: lookup.documentType,
        documentNumber: lookup.documentNumber,
        name: lookup.name,
        warehouseId,
      },
    });

    return mapPosCustomerResponse(created);
  }
}
