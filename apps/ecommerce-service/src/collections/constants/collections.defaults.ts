export const DEFAULT_COLLECTIONS_SLUG = 'home-collections';

export const DEFAULT_COLLECTIONS_CACHE_KEY = 'ecommerce:home:collections:public';

export const COLLECTIONS_CACHE_TTL_SECONDS = 300;

export interface HomeCollectionItem {
  id: string;
  tag?: string;
  title: string;
  description?: string;
  status: boolean;
  productIds: string[];
}

export interface HomeCollectionsConfig {
  collections: HomeCollectionItem[];
}

export interface PublicCollectionsResponse {
  collections: HomeCollectionItem[];
}

export const DEFAULT_COLLECTIONS_CONFIG: HomeCollectionsConfig = {
  collections: [
    {
      id: 'todays-deal',
      tag: 'special offer',
      title: "today's deal",
      description:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
      status: true,
      productIds: [],
    },
  ],
};
