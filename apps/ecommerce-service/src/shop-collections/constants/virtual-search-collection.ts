import type { ShopCollectionItem } from './shop-collections.defaults';

/** Slug reservado: PLP global de búsqueda (no aparece en el listado público de colecciones). */
export const VIRTUAL_SEARCH_COLLECTION_SLUG = 'search';

export const VIRTUAL_SEARCH_COLLECTION: ShopCollectionItem = {
  id: VIRTUAL_SEARCH_COLLECTION_SLUG,
  slug: VIRTUAL_SEARCH_COLLECTION_SLUG,
  label: 'Búsqueda',
  description: 'Resultados de búsqueda en toda la tienda',
  status: true,
  productIds: [],
};

export function isVirtualSearchCollectionSlug(slug: string): boolean {
  return slug === VIRTUAL_SEARCH_COLLECTION_SLUG;
}
