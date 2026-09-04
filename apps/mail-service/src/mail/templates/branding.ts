import { ConfigService } from '@nestjs/config';

import { MailBranding } from './layout';

export function resolveMailBranding(config: ConfigService): MailBranding {
  const storeName = config.get<string>('MAIL_FROM_NAME', 'Novedades Maritex');
  const storeUrl = config.get<string>(
    'ECOMMERCE_STORE_URL',
    config.get<string>('FRONTEND_URL', 'http://localhost:3001'),
  );

  const socialLinks = {
    facebook: config.get<string>('MAIL_SOCIAL_FACEBOOK', ''),
    instagram: config.get<string>('MAIL_SOCIAL_INSTAGRAM', ''),
    twitter: config.get<string>('MAIL_SOCIAL_TWITTER', ''),
    youtube: config.get<string>('MAIL_SOCIAL_YOUTUBE', ''),
    pinterest: config.get<string>('MAIL_SOCIAL_PINTEREST', ''),
  };

  const filteredSocialLinks = Object.fromEntries(
    Object.entries(socialLinks).filter(([, value]) => Boolean(value?.trim())),
  );

  return {
    storeName,
    storeUrl,
    logoUrl: config.get<string>('MAIL_LOGO_URL', '') || undefined,
    bannerUrl: config.get<string>('MAIL_BANNER_URL', '') || undefined,
    supportEmail:
      config.get<string>('MAIL_SUPPORT_EMAIL', '') ||
      config.get<string>('MAIL_FROM_EMAIL', '') ||
      config.get<string>('ZOHO_USER', '') ||
      undefined,
    socialLinks: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : undefined,
  };
}
