export const DEFAULT_CATEGORY_PRODUCTS_SLUG = 'home-category-products';

export const DEFAULT_CATEGORY_PRODUCTS_CACHE_KEY = 'ecommerce:home:category-products:public';

export const CATEGORY_PRODUCTS_CACHE_TTL_SECONDS = 300;

export interface HomeCategoryProductTabConfigItem {
  id: string;
  name: string;
  slug?: string;
  productIds: string[];
}

export interface HomeCategoryProductSectionConfig {
  status: boolean;
  leftPanel?: {
    title: string;
    status: boolean;
    productIds: string[];
  };
  rightPanel: {
    productCategory: {
      title: string;
      status: boolean;
      tabs: HomeCategoryProductTabConfigItem[];
    };
    productBanner?: {
      status: boolean;
      imageUrl: string;
      href: string;
      alt?: string;
    };
  };
}

export interface PublicCategoryProductSectionResponse {
  section: HomeCategoryProductSectionConfig | null;
}

export const DEFAULT_CATEGORY_PRODUCTS_CONFIG: HomeCategoryProductSectionConfig = {
  status: true,
  leftPanel: {
    title: 'Menos de S/ 20',
    status: true,
    productIds: [],
  },
  rightPanel: {
    productCategory: {
      title: 'RECOMENDACIONES PARA TI',
      status: true,
      tabs: [],
    },
    productBanner: {
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_7.png',
      href: '/tienda',
      alt: 'Banner de categoría',
    },
  },
};
