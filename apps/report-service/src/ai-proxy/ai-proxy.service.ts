import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AiProxyService — Equivale a AiEngineClient + AiProductContextService
 *   + AiPredictionController + AiReportController de Laravel.
 *
 * Proxy HTTP simple al nm_ai_engine (Python/FastAPI en :8010).
 * No transforma los datos; el frontend consume las respuestas directamente.
 * Si el AI engine no está disponible retorna un ServiceUnavailableException
 * claro en vez de colgar la respuesta.
 */
@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly aiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.aiUrl  = config.get('AI_ENGINE_URL', 'http://localhost:8010');
    this.apiKey = config.get('AI_ENGINE_API_KEY', '');
  }

  async getProductContext(productId: string) {
    return this.forward('GET', `/products/${productId}/context`);
  }

  async predictPrice(productId: string, body: unknown) {
    return this.forward('POST', `/predict/price`, { productId, ...body as object });
  }

  async predictDemand(productId: string, body: unknown) {
    return this.forward('POST', `/predict/demand`, { productId, ...body as object });
  }

  async getProductsInventoryReport(warehouseId: string, horizonDays = 30) {
    return this.forward(
      'GET',
      `/reports/products-inventory?warehouse_id=${warehouseId}&horizon_days=${horizonDays}`,
    );
  }

  private async forward(method: string, path: string, body?: unknown) {
    try {
      const response = await fetch(`${this.aiUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000), // 15 s timeout
      });

      if (!response.ok) {
        this.logger.warn(`AI Engine → ${response.status} ${path}`);
        throw new Error(`AI Engine error: ${response.status}`);
      }
      return response.json();
    } catch (err) {
      this.logger.error(`AI Engine no disponible: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'El motor de inteligencia artificial no está disponible. Intenta más tarde.',
      );
    }
  }
}
