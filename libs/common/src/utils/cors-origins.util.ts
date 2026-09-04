import type { ConfigService } from '@nestjs/config';

/**
 * Orígenes permitidos para CORS del browser.
 * - CORS_ORIGINS: lista explícita separada por comas
 * - FRONTEND_URL: panel admin (nm-frontend-v2)
 * - ECOMMERCE_STORE_URL: storefront (nm-ecommerce)
 */
export function resolveCorsOrigins(config: ConfigService): string[] {
  const explicit = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
    config.get<string>('ECOMMERCE_STORE_URL', 'http://localhost:3015'),
  ].filter(Boolean);

  return [...new Set([...explicit, ...defaults])];
}
