import {
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedCustomer } from './types/authenticated-customer.type';

/**
 * @deprecated Usar auth-service: POST /v1/auth/customer/register|login y GET /v1/auth/customer/me
 */
@Injectable()
export class CustomerAuthService {
  register(): never {
    throw new GoneException(
      'El registro de clientes se realiza en auth-service (/v1/auth/customer/register).',
    );
  }

  login(): never {
    throw new GoneException(
      'El inicio de sesión de clientes se realiza en auth-service (/v1/auth/customer/login).',
    );
  }

  getProfile(_customerId: string): never {
    throw new UnauthorizedException('Use auth-service /v1/auth/customer/me.');
  }

  resolveCustomer(_customer: AuthenticatedCustomer): never {
    throw new GoneException('Endpoint deprecado.');
  }
}
