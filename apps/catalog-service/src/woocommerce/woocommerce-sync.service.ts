import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '@app/database';

interface WooProduct {
  id: number;
  name: string;
  status: string;
  variations?: number[];
  images?: { src: string }[];
}

/**
 * WoocommerceSyncService — Equivale a WooCommerceSyncService de Laravel.
 *
 * Diferencias clave:
 * - El artisan `SyncWooCommerceCatalogCommand` se reemplaza por un Cron de NestJS
 *   (@nestjs/schedule). Para ejecución manual: llamar a syncAll() desde el controller.
 * - Las WP Application Password para sideload de imágenes se configuran igual en .env
 * - Los checksum maps (woocommerce_sync_maps) se mantienen igual en Prisma
 */
@Injectable()
export class WoocommerceSyncService {
  private readonly logger = new Logger(WoocommerceSyncService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── Sync manual (equivale a POST /products/:id/woocommerce/sync) ──────────

  async syncProduct(productId: string): Promise<{ synced: boolean; wooId?: number }> {
    const product = await this.db.product.findFirst({
      where: { id: productId, isDeleted: false },
      include: {
        productSizes: {
          include: {
            size: true,
            productSizeColors: { include: { color: true } },
            inventoryBalances: true,
          },
        },
      },
    });

    if (!product) return { synced: false };

    const existing = await this.db.woocommerceSyncMap.findFirst({
      where: { productId },
    });

    const wooPayload = this.buildWooPayload(product);

    try {
      if (existing?.wooProductId) {
        await this.wooRequest('PUT', `/products/${existing.wooProductId}`, wooPayload);
        await this.db.woocommerceSyncMap.update({
          where: { id: existing.id },
          data: { lastSyncedAt: new Date(), checksum: this.checksum(wooPayload) },
        });
        return { synced: true, wooId: existing.wooProductId };
      } else {
        const created = await this.wooRequest<WooProduct>('POST', '/products', wooPayload);
        await this.db.woocommerceSyncMap.create({
          data: {
            productId,
            wooProductId: created.id,
            checksum: this.checksum(wooPayload),
            lastSyncedAt: new Date(),
          },
        });
        return { synced: true, wooId: created.id };
      }
    } catch (err) {
      this.logger.error(`WooCommerce sync falló para producto ${productId}`, err);
      return { synced: false };
    }
  }

  // ── Sync automático diario (equivale al artisan command) ──────────────────
  // Ejecuta a las 2:00 AM (hora Perú = UTC-5 → 7:00 AM UTC)
  @Cron('0 7 * * *')
  async syncAll() {
    this.logger.log('Iniciando sincronización completa con WooCommerce...');
    const products = await this.db.product.findMany({
      where: { isDeleted: false, wooStatus: 'publish' },
      select: { id: true },
    });

    let synced = 0;
    for (const { id } of products) {
      const result = await this.syncProduct(id);
      if (result.synced) synced++;
    }
    this.logger.log(`Sync completo: ${synced}/${products.length} productos sincronizados.`);
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildWooPayload(product: any) {
    return {
      name: product.name,
      status: product.wooStatus,
      description: product.description ?? '',
      type: 'variable',
      attributes: [
        {
          name: 'Talla',
          variation: true,
          options: product.productSizes.map((ps: { size: { description: string } }) => ps.size.description),
        },
        {
          name: 'Color',
          variation: true,
          options: [
            ...new Set(
              product.productSizes.flatMap((ps: { productSizeColors: { color: { description: string } }[] }) =>
                ps.productSizeColors.map((psc) => psc.color.description),
              ),
            ),
          ],
        },
      ],
    };
  }

  private async wooRequest<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const baseUrl = this.config.getOrThrow<string>('WOOCOMMERCE_URL');
    const key = this.config.getOrThrow<string>('WOOCOMMERCE_CONSUMER_KEY');
    const secret = this.config.getOrThrow<string>('WOOCOMMERCE_CONSUMER_SECRET');
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');

    const response = await fetch(`${baseUrl}/wp-json/wc/v3${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private checksum(payload: unknown): string {
    const json = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      hash = (hash << 5) - hash + json.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
}
