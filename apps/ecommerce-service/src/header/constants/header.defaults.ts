export const DEFAULT_STORE_HEADER_SLUG = 'default';

export const DEFAULT_HEADER_CACHE_KEY = 'ecommerce:header:public';

export const DEFAULT_NAVIGATION_ITEMS = [
  { label: 'Inicio', href: '/', order: 0 },
  { label: 'Tienda', href: '/tienda', order: 1 },
  { label: 'Novedades', href: '/tienda?sort=new', order: 2 },
  { label: 'Ofertas', href: '/tienda?onSale=true', order: 3 },
  { label: 'Contacto', href: '/contacto', order: 4 },
] as const;

export const DEFAULT_HEADER_CONFIG = {
  slug: DEFAULT_STORE_HEADER_SLUG,
  topbarMessage: 'Bienvenido a Novedades Maritex',
  supportPhone: null,
  logoText: 'Novedades Maritex',
  logoUrl: '/logo.png',
  topBarEnabled: true,
  stickyEnabled: true,
} as const;
