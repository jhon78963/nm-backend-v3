import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CreateSizeDto } from './dto/create-size.dto';
import { buildMasterStockByProductSizeId } from '../products/product-inventory.helper';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';

@Injectable()
export class SizesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(sizeTypeId?: string, search?: string) {
    const typeIds = sizeTypeId
      ? sizeTypeId.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    return this.db.size.findMany({
      where: {
        isDeleted: false,
        ...(typeIds.length > 0 && { sizeTypeId: { in: typeIds } }),
        ...(search && {
          description: { contains: search, mode: 'insensitive' as const },
        }),
      },
      include: { sizeType: { select: { id: true, description: true } } },
      orderBy: { description: 'asc' },
    });
  }

  async findAllPaginated(
    query: Record<string, string | undefined>,
    sizeTypeId?: string,
  ) {
    const { page, limit, search } = parsePagination(query);
    const typeIds = sizeTypeId
      ? sizeTypeId.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    const where = {
      isDeleted: false,
      ...(typeIds.length > 0 && { sizeTypeId: { in: typeIds } }),
      ...(search && {
        description: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.size.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { sizeType: { select: { id: true, description: true } } },
        orderBy: { description: 'asc' },
      }),
      this.db.size.count({ where }),
    ]);

    return paginatedResponse(rows, total, limit);
  }

  async findForProductSelection(productId: string, sizeTypeIds: string[] = []) {
    const product = await this.db.product.findFirst({
      where: { id: productId, isDeleted: false },
      select: { warehouseId: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');

    const productSizes = await this.db.productSize.findMany({
      where: { productId, isDeleted: false },
    });
    const productSizeBySizeId = new Map(
      productSizes.map((ps) => [ps.sizeId, ps]),
    );

    const productSizeIds = productSizes.map((ps) => ps.id);
    const stockByProductSizeId = product.warehouseId
      ? await buildMasterStockByProductSizeId(
          this.db,
          product.warehouseId,
          productSizeIds,
        )
      : new Map<string, number>();

    const sizes = await this.db.size.findMany({
      where: {
        isDeleted: false,
        ...(sizeTypeIds.length > 0 && { sizeTypeId: { in: sizeTypeIds } }),
      },
      orderBy: { description: 'asc' },
    });

    return sizes
      .map((size) => {
        const ps = productSizeBySizeId.get(size.id);
        if (!ps) {
          return {
            id: size.id,
            productSizeId: null,
            description: size.description,
            barcode: null,
            isExists: false,
            stock: null,
            purchasePrice: null,
            salePrice: null,
            minSalePrice: null,
          };
        }

        return {
          id: size.id,
          productSizeId: ps.id,
          description: size.description,
          barcode: ps.barcode,
          isExists: true,
          stock: stockByProductSizeId.get(ps.id) ?? 0,
          purchasePrice: Number(ps.purchasePrice),
          salePrice: Number(ps.salePrice),
          minSalePrice: ps.minSalePrice != null ? Number(ps.minSalePrice) : null,
        };
      })
      .sort((a, b) => {
        if (a.stock === null && b.stock !== null) return 1;
        if (a.stock !== null && b.stock === null) return -1;
        return a.description.localeCompare(b.description);
      });
  }

  async findAllSizeTypes() {
    return this.db.sizeType.findMany({ orderBy: { description: 'asc' } });
  }

  async findById(id: string) {
    const size = await this.db.size.findFirst({
      where: { id, isDeleted: false },
      include: { sizeType: true },
    });
    if (!size) throw new NotFoundException('Talla no encontrada.');
    return size;
  }

  async create(dto: CreateSizeDto) {
    const exists = await this.db.size.findFirst({
      where: {
        description: { equals: dto.description, mode: 'insensitive' },
        sizeTypeId: dto.sizeTypeId ?? null,
        isDeleted: false,
      },
    });
    if (exists) throw new ConflictException('Ya existe una talla con ese nombre en ese tipo.');
    return this.db.size.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateSizeDto>) {
    await this.findById(id);
    return this.db.size.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.db.size.update({ where: { id }, data: { isDeleted: true } });
  }
}
