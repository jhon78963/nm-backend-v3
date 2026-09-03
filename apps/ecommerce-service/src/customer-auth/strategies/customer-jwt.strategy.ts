import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CLIENTE_ROLE } from '@app/common/auth/ecommerce-customer-permissions';
import { DatabaseService } from '@app/database';

import type {
  AuthenticatedCustomer,
  CustomerJwtPayload,
} from '../types/authenticated-customer.type';

interface StaffJwtPayload {
  sub: string;
  roles?: string[];
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: CustomerJwtPayload | StaffJwtPayload): Promise<AuthenticatedCustomer> {
    if ('actorType' in payload && payload.actorType === 'customer') {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    }

    const staffPayload = payload as StaffJwtPayload;
    if (!staffPayload.roles?.includes(CLIENTE_ROLE)) {
      throw new UnauthorizedException('Token de cliente no válido.');
    }

    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { userId: staffPayload.sub, isEnabled: true },
      select: { id: true, email: true, name: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Perfil de cliente no encontrado.');
    }

    return customer;
  }
}
