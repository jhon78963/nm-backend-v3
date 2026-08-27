import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — Marca una ruta como pública (sin autenticación JWT).
 * Equivale a colocar la ruta en el grupo `public_api.php` de Laravel.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
