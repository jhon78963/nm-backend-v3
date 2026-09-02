export const DEFAULT_SERVICES_SLUG = 'home-services';

export const DEFAULT_SERVICES_CACHE_KEY = 'ecommerce:home:services:public';

export const SERVICES_CACHE_TTL_SECONDS = 300;

export interface HomeServiceItemConfig {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  status: boolean;
  order: number;
}

export interface HomeServicesConfig {
  status: boolean;
  services: HomeServiceItemConfig[];
}

export const DEFAULT_SERVICES_CONFIG: HomeServicesConfig = {
  status: true,
  services: [
    {
      id: 'service-1',
      imageUrl: '/images/theme/marketplace_one/service.png',
      title: 'Envío Gratuito',
      description: 'En compras mayores a S/ 99',
      status: true,
      order: 0,
    },
    {
      id: 'service-2',
      imageUrl: '/images/theme/marketplace_one/service.png',
      title: 'Devoluciones',
      description: '30 días sin preguntas',
      status: true,
      order: 1,
    },
    {
      id: 'service-3',
      imageUrl: '/images/theme/marketplace_one/service.png',
      title: 'Soporte 24/7',
      description: 'Atención al cliente siempre disponible',
      status: true,
      order: 2,
    },
  ],
};
