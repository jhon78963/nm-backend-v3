export const DEFAULT_SHOP_COLLECTIONS_SLUG = 'shop-collections';

export const DEFAULT_SHOP_COLLECTIONS_CACHE_KEY = 'ecommerce:shop:collections:public';

export const SHOP_COLLECTIONS_CACHE_TTL_SECONDS = 300;

export interface ShopCollectionItem {
  id: string;
  slug: string;
  label: string;
  description?: string;
  bannerImageUrl?: string;
  status: boolean;
  productIds: string[];
}

export interface ShopCollectionsConfig {
  collections: ShopCollectionItem[];
}

export interface PublicShopCollectionsResponse {
  collections: ShopCollectionItem[];
}

export const DEFAULT_SHOP_COLLECTIONS_CONFIG: ShopCollectionsConfig = {
  collections: [
    { id: 'ninos', slug: 'ninos', label: 'Niños', status: true, productIds: [] },
    { id: 'jovenes', slug: 'jovenes', label: 'Jovenes', status: true, productIds: [] },
    { id: 'senoritas', slug: 'senoritas', label: 'Señoritas', status: true, productIds: [] },
    {
      id: 'adulto-mayor',
      slug: 'adulto-mayor',
      label: 'Adulto mayor',
      status: true,
      productIds: [],
    },
    { id: 'deporte', slug: 'deporte', label: 'Deporte', status: true, productIds: [] },
    { id: 'ofertas', slug: 'ofertas', label: 'Ofertas', status: true, productIds: [] },
  ],
};
