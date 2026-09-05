import type { ConfigService } from '@nestjs/config';

function expandOriginVariants(origin: string): string[] {
  const variants = new Set<string>([origin]);

  try {
    const url = new URL(origin);

    if (url.hostname === 'localhost') {
      variants.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`);
    }

    if (url.hostname === '127.0.0.1') {
      variants.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ''}`);
    }

    if (url.hostname.startsWith('www.')) {
      variants.add(`${url.protocol}//${url.hostname.slice(4)}${url.port ? `:${url.port}` : ''}`);
    } else if (!url.hostname.includes('localhost') && !url.hostname.startsWith('www.')) {
      variants.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ''}`);
    }
  } catch {
    // Ignore invalid URLs in env.
  }

  return [...variants];
}

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

  const expanded = [...explicit, ...defaults].flatMap(expandOriginVariants);

  return [...new Set(expanded)];
}
