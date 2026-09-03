import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { DatabaseService } from '@app/database';

import type { AuthenticatedCustomer, CustomerJwtPayload } from './types/authenticated-customer.type';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.ecommerceCustomer.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const customer = await this.db.ecommerceCustomer.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
      },
    });

    return this.buildAuthResponse(customer);
  }

  async login(dto: LoginCustomerDto) {
    const email = dto.email.trim().toLowerCase();
    const customer = await this.db.ecommerceCustomer.findUnique({ where: { email } });

    if (!customer || !customer.isEnabled) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    return this.buildAuthResponse(customer);
  }

  async getProfile(customerId: string) {
    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { id: customerId, isEnabled: true },
      select: { id: true, email: true, name: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    return customer;
  }

  private buildAuthResponse(customer: { id: string; email: string; name: string }) {
    const payload: CustomerJwtPayload = {
      sub: customer.id,
      email: customer.email,
      name: customer.name,
      actorType: 'customer',
    };

    return {
      access_token: this.jwt.sign(payload),
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      } satisfies AuthenticatedCustomer,
    };
  }
}
