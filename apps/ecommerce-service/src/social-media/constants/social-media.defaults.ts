export const DEFAULT_SOCIAL_MEDIA_SLUG = 'home-social-media';

export const DEFAULT_SOCIAL_MEDIA_CACHE_KEY = 'ecommerce:home:social-media:public';

export const SOCIAL_MEDIA_CACHE_TTL_SECONDS = 300;

export type SocialMediaPlatform = 'tiktok' | 'instagram';

export interface SocialMediaBannerConfig {
  id: string;
  imageUrl: string;
  href: string;
  status: boolean;
  order: number;
}

export interface HomeSocialMediaConfig {
  status: boolean;
  title: string;
  platform: SocialMediaPlatform;
  profileUrl?: string;
  banners: SocialMediaBannerConfig[];
}

const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/';

export const DEFAULT_SOCIAL_MEDIA_CONFIG: HomeSocialMediaConfig = {
  status: true,
  title: '# TIKTOK',
  platform: 'tiktok',
  profileUrl: TIKTOK_PROFILE_URL,
  banners: [
    {
      id: 'tiktok-6',
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_insta_6.png',
      href: TIKTOK_PROFILE_URL,
      order: 0,
    },
    {
      id: 'tiktok-5',
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_insta_5.png',
      href: TIKTOK_PROFILE_URL,
      order: 1,
    },
    {
      id: 'tiktok-4',
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_insta_4.png',
      href: TIKTOK_PROFILE_URL,
      order: 2,
    },
    {
      id: 'tiktok-3',
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_insta_3.png',
      href: TIKTOK_PROFILE_URL,
      order: 3,
    },
    {
      id: 'tiktok-2',
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_insta_2.png',
      href: TIKTOK_PROFILE_URL,
      order: 4,
    },
    {
      id: 'tiktok-1',
      status: true,
      imageUrl: '/images/theme/marketplace_one/marketplace_one_insta_1.png',
      href: TIKTOK_PROFILE_URL,
      order: 5,
    },
  ],
};
