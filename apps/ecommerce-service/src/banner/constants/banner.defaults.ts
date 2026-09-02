export const DEFAULT_STORE_BANNER_SLUG = 'default';

export const DEFAULT_BANNER_CACHE_KEY = 'ecommerce:banners:public';

export const DEFAULT_HOME_BANNERS = [
  {
    imageUrl: '/images/banners/banner-1.png',
    href: '/tienda',
    order: 0,
  },
  {
    imageUrl: '/images/banners/banner-2.png',
    href: '/tienda?sort=new',
    order: 1,
  },
  {
    imageUrl: '/images/banners/banner-3.png',
    href: '/tienda?onSale=true',
    order: 2,
  },
  {
    imageUrl: '/images/banners/banner-4.png',
    href: '/contacto',
    order: 3,
  },
] as const;
