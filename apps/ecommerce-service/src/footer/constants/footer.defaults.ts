export const DEFAULT_FOOTER_SLUG = 'default-footer';

export const DEFAULT_FOOTER_CACHE_KEY = 'ecommerce:footer:public';

export const FOOTER_CACHE_TTL_SECONDS = 300;

export interface FooterLinkItem {
  id: string;
  name: string;
  href: string;
}

export interface FooterCategoryItem {
  id: string;
  name: string;
  href: string;
}

export interface PublicFooterConfig {
  newsletterTitle: string;
  newsletterSubtitle: string;
  aboutText: string;
  address: string;
  supportNumber: string;
  supportEmail: string;
  socialMediaEnabled: boolean;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  pinterestUrl?: string;
  tiktokUrl?: string;
  categories: FooterCategoryItem[];
  usefulLinks: FooterLinkItem[];
  helpCenterLinks: FooterLinkItem[];
  copyrightEnabled: boolean;
  copyrightContent: string;
  paymentImageUrl?: string;
}

export const DEFAULT_FOOTER_CONFIG: PublicFooterConfig = {
  newsletterTitle: 'KNOW IT ALL FIRST!',
  newsletterSubtitle: 'Never Miss Anything From Store By Signing Up To Our Newsletter.',
  aboutText:
    'Discover the latest trends and enjoy seamless shopping with our exclusive collections.',
  address: 'Puesto C-74, Mercado Mayorista, Trujillo, Perú',
  supportNumber: '+51 984802248',
  supportEmail: 'novedadesmaritex@gmail.com',
  socialMediaEnabled: true,
  facebookUrl: 'https://facebook.com/',
  twitterUrl: 'https://twitter.com/',
  instagramUrl: 'https://instagram.com/',
  pinterestUrl: 'https://pinterest.com/',
  tiktokUrl: 'https://www.tiktok.com/',
  categories: [
    { id: '500', name: 'Baby Essentials', href: '/tienda?categoria=baby-essentials' },
    { id: '520', name: 'Bag Emporium', href: '/tienda?categoria=bag-emporium' },
    { id: '540', name: 'Books', href: '/tienda?categoria=books' },
    { id: '560', name: 'Christmas', href: '/tienda?categoria=christmas' },
    { id: '580', name: 'Classic Furnishings', href: '/tienda?categoria=classic-furnishings' },
  ],
  usefulLinks: [
    { id: '1', name: 'Home', href: '/' },
    { id: '3', name: 'About Us', href: '/acerca-de-nosotros' },
    { id: '5', name: 'Offers', href: '/tienda' },
  ],
  helpCenterLinks: [
    { id: '1', name: 'My Account', href: '/micuenta/miperfil' },
    { id: '2', name: 'My Orders', href: '/micuenta/pedidos' },
    { id: '4', name: 'Wishlist', href: '/favoritos' },
    { id: '6', name: "Faq's", href: '/preguntas-frecuentes' },
    { id: '7', name: 'Contact Us', href: '/contactanos' },
  ],
  copyrightEnabled: true,
  copyrightContent: '2026 NovedadesMaritex © Todos los derechos reservados.',
  paymentImageUrl: '/images/theme/data/payments.png',
};
