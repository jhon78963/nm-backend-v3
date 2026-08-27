import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@app/common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly services: Record<string, string>;

  constructor(config: ConfigService) {
    this.services = {
      auth:      config.get('AUTH_SERVICE_URL',      'http://localhost:3001'),
      catalog:   config.get('CATALOG_SERVICE_URL',   'http://localhost:3002'),
      inventory: config.get('INVENTORY_SERVICE_URL', 'http://localhost:3003'),
      pos:       config.get('POS_SERVICE_URL',       'http://localhost:3004'),
      finance:   config.get('FINANCE_SERVICE_URL',   'http://localhost:3005'),
      hr:        config.get('HR_SERVICE_URL',        'http://localhost:3006'),
      report:    config.get('REPORT_SERVICE_URL',    'http://localhost:3007'),
    };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check del gateway' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: Object.keys(this.services),
    };
  }

  /**
   * GET /health/services — Verifica la disponibilidad de cada microservicio.
   * Útil para dashboards de monitoreo y CI/CD.
   */
  @Public()
  @Get('services')
  @ApiOperation({ summary: 'Estado de todos los microservicios' })
  async checkServices() {
    const results = await Promise.allSettled(
      Object.entries(this.services).map(async ([name, url]) => {
        const start = Date.now();
        const response = await fetch(`${url}/health`, {
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);
        return {
          name,
          status: response?.ok ? 'up' : 'down',
          latencyMs: Date.now() - start,
          url,
        };
      }),
    );

    const services = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { name: 'unknown', status: 'down', latencyMs: 0 },
    );

    const allUp = services.every((s) => s.status === 'up');

    return {
      gateway: 'up',
      timestamp: new Date().toISOString(),
      healthy: allUp,
      services,
    };
  }
}
