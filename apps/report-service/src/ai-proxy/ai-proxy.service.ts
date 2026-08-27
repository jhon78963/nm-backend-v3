import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportsService } from '../reports/reports.service';
import { AiProductContextService } from './ai-product-context.service';

interface BulkPredictionItem {
  product_id: string;
  suggested_price: number | null;
  suggested_min_price: number | null;
  suggested_purchase_quantity: number | null;
  projected_sales: number | null;
  is_dead_stock: boolean;
  price_error: string | null;
  demand_error: string | null;
}

interface BulkPredictionResponse {
  items: BulkPredictionItem[];
  processed: number;
  errors: number;
}

const BULK_CHUNK_SIZE = 500;
const DEFAULT_TIMEOUT_MS = 30_000;
const BULK_TIMEOUT_MS = 120_000;

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly aiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly reportsService: ReportsService,
    private readonly contextService: AiProductContextService,
  ) {
    this.aiUrl = config.get('AI_ENGINE_URL', 'http://localhost:3008');
    this.apiKey = config.get('AI_ENGINE_API_KEY', '');
  }

  async getProductContext(productId: string, warehouseId: string, canViewCost: boolean) {
    return this.contextService.buildContext(productId, warehouseId, canViewCost);
  }

  async predictPrice(productId: string, warehouseId: string, canViewCost: boolean) {
    const context = await this.contextService.buildContext(productId, warehouseId, canViewCost);
    return this.postToEngine(
      '/api/v1/predict/price',
      this.contextService.toPriceEnginePayload(context),
    );
  }

  async predictDemand(
    productId: string,
    warehouseId: string,
    canViewCost: boolean,
    horizonDays = 30,
  ) {
    const context = await this.contextService.buildContext(productId, warehouseId, canViewCost);
    return this.postToEngine(
      '/api/v1/predict/demand',
      this.contextService.toDemandEnginePayload(context, horizonDays),
    );
  }

  async getProductsInventoryReport(
    warehouseId: string,
    horizonDays = 30,
    canViewCost = true,
  ) {
    const products = await this.reportsService.getProductsInventory(warehouseId);
    const productIds = products.map((product) => product.id);
    const contextMap = await this.contextService.buildContextMap(
      productIds,
      warehouseId,
      canViewCost,
    );

    const bulkItems = products
      .map((product) => {
        const context = contextMap[product.id];
        if (!context) {
          return null;
        }

        return {
          product_id: product.id,
          price: this.contextService.toPriceEnginePayload(context),
          demand: this.contextService.toDemandEnginePayload(context, horizonDays),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const aiByProductId = await this.runBulkPredictions(bulkItems);

    let deadStockCount = 0;
    let totalErrors = 0;

    const enrichedProducts = products.map((product) => {
      const ai = aiByProductId[product.id];
      if (!ai) {
        return product;
      }

      if (ai.is_dead_stock) {
        deadStockCount += 1;
      }
      if (ai.price_error || ai.demand_error) {
        totalErrors += 1;
      }

      return { ...product, ai };
    });

    return {
      success: true,
      data: {
        products: enrichedProducts,
        horizon_days: horizonDays,
        ai_summary: {
          processed: bulkItems.length,
          errors: totalErrors,
          dead_stock_count: deadStockCount,
        },
      },
    };
  }

  private async runBulkPredictions(
    bulkItems: Array<{
      product_id: string;
      price: ReturnType<AiProductContextService['toPriceEnginePayload']>;
      demand: ReturnType<AiProductContextService['toDemandEnginePayload']>;
    }>,
  ): Promise<Record<string, BulkPredictionItem>> {
    const results: Record<string, BulkPredictionItem> = {};

    for (let index = 0; index < bulkItems.length; index += BULK_CHUNK_SIZE) {
      const chunk = bulkItems.slice(index, index + BULK_CHUNK_SIZE);

      try {
        const response = await this.postToEngine<BulkPredictionResponse>(
          '/api/v1/predict/bulk',
          { items: chunk },
          BULK_TIMEOUT_MS,
        );

        for (const item of response.items ?? []) {
          results[item.product_id] = item;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido del motor de IA';
        for (const item of chunk) {
          results[item.product_id] = {
            product_id: item.product_id,
            suggested_price: null,
            suggested_min_price: null,
            suggested_purchase_quantity: null,
            projected_sales: null,
            is_dead_stock: false,
            price_error: message,
            demand_error: message,
          };
        }
      }
    }

    return results;
  }

  private async postToEngine<T>(
    path: string,
    body: unknown,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    if (!this.aiUrl || !this.apiKey) {
      throw new ServiceUnavailableException(
        'Motor de IA no configurado (AI_ENGINE_URL / AI_ENGINE_API_KEY).',
      );
    }

    try {
      const response = await fetch(`${this.aiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const detail = await this.readErrorDetail(response);
        this.logger.warn(`AI Engine → ${response.status} ${path}: ${detail}`);
        throw new BadGatewayException(detail);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error(`AI Engine no disponible: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'El motor de inteligencia artificial no está disponible. Intenta más tarde.',
      );
    }
  }

  private async readErrorDetail(response: Response): Promise<string> {
    try {
      const payload = await response.json() as { detail?: string | Array<{ msg?: string }> };
      if (typeof payload.detail === 'string') {
        return payload.detail;
      }
      if (Array.isArray(payload.detail)) {
        return payload.detail.map((item) => item.msg ?? 'Error de validación').join('; ');
      }
    } catch {
      // ignore JSON parse errors
    }

    return `AI Engine error: ${response.status}`;
  }
}
