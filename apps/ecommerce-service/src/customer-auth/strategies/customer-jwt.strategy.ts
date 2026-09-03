import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type {
  AuthenticatedCustomer,
  CustomerJwtPayload,
} from '../types/authenticated-customer.type';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: CustomerJwtPayload): AuthenticatedCustomer {
    if (payload.actorType !== 'customer') {
      throw new UnauthorizedException('Token de cliente no válido.');
    }

    const customer = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    return customer;
  }
}
