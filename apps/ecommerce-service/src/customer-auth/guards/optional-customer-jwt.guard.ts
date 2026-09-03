import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalCustomerJwtAuthGuard extends AuthGuard('customer-jwt') {
  handleRequest<TCustomer>(err: Error | null, customer: TCustomer): TCustomer | null {
    if (err || !customer) {
      return null;
    }

    return customer;
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return true;
    }

    return super.canActivate(context);
  }
}
