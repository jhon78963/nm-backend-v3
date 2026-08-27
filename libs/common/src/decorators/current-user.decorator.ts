import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

/**
 * @CurrentUser() — Equivale a `auth()->user()` en Laravel.
 * Extrae el usuario del request populado por JwtStrategy@validate.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
