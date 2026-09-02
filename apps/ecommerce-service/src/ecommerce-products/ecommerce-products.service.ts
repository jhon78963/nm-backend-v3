import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { buildMasterStockByProductSizeId } from '@app/common/utils/product-inventory.util';

import { PublicProductsQueryDto } from './dto/public-products-query.dto';
import {
  mapCatalogProductToPublicItem,
  type PublicProductsResponse,
} from './ecommerce-products.mapper';

@Injectable()
export class EcommerceProductsService {
  constructor(private readonly db: DatabaseService) {}

  async getPublicProducts(query: PublicProductsQueryDto): Promise<PublicProductsResponse> {
    const productIds = this.parseProductIds(query.ids);

    if (productIds.length === 0) {
      throw new BadRequestException('Debe enviar al menos un ID de producto válido.');
    }

    const products = await this.db.product.findMany({
      where: {
        id: { in: productIds },
        warehouseId: query.warehouseId,
        isDeleted: false,
        status: { in: ['active', 'AVAILABLE'] },
        wooStatus: { in: ['publish', 'draft'] },
      },
      include: {
        productSizes: {
          where: { isDeleted: false },
          select: {
            id: true,
            salePrice: true,
            isDeleted: true,
          },
        },
        media: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            url: true,
            isCover: true,
            sortOrder: true,
          },
        },
      },
    });

    const productSizeIds = products.flatMap((product) =>
      product.productSizes.map((size) => size.id),
    );

    const stockByProductSizeId = await buildMasterStockByProductSizeId(
      this.db,
      query.warehouseId,
      productSizeIds,
    );

    const productsById = new Map(
      products.map((product) => [
        product.id,
        mapCatalogProductToPublicItem(product, stockByProductSizeId),
      ]),
    );

    return {
      products: productIds
        .map((id) => productsById.get(id))
        .filter((product): product is NonNullable<typeof product> => Boolean(product)),
    };
  }

  private parseProductIds(ids: string): string[] {
    return [...new Set(ids.split(',').map((id) => id.trim()).filter(Boolean))];
  }
}
