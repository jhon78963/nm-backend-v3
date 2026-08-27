import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard exclusivo para el endpoint /auth/refresh.
 * Valida el refresh token usando la estrategia 'jwt-refresh'.
 * El refresh token NO puede usarse como bearer en rutas protegidas por JwtAuthGuard
 * (dos estrategias distintas → equivale al test SEC de Sanctum en Laravel).
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
