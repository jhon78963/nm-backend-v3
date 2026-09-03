import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedCustomer } from '../types/authenticated-customer.type';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCustomer => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedCustomer }>();
    return request.user;
  },
);
