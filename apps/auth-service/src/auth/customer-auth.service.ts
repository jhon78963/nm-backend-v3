import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { CLIENTE_ROLE } from '@app/common/auth/ecommerce-customer-permissions';
import { DatabaseService } from '@app/database';
import { EcommerceMailTemplate, MailClientService } from '@app/mail-client';

import { AuthService } from './auth.service';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from '../users/users.service';

export interface CustomerAuthProfile {
  id: string;
  email: string;
  name: string;
}

export interface CustomerWelcomeCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description?: string | null;
}

export interface CustomerAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  customer: CustomerAuthProfile;
  welcomeCoupon?: CustomerWelcomeCoupon | null;
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly mailClient: MailClientService,
  ) {}

  async register(dto: RegisterCustomerDto): Promise<CustomerAuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const tenantId = await this.resolveTenantId();

    const existingUser = await this.usersService.findByUsernameOrEmail(email);
    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con este correo.');
    }

    const existingCustomer = await this.db.ecommerceCustomer.findUnique({
      where: { email },
    });
    if (existingCustomer) {
      throw new ConflictException('Ya existe una cuenta con este correo.');
    }

    const { name: firstName, surname } = this.splitName(name);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.db.user.create({
      data: {
        username: await this.buildUniqueUsername(email),
        email,
        name: firstName,
        surname,
        passwordHash,
        tenantId,
        warehouseId: null,
      },
    });

    await this.usersService.assignRolesByName(user.id, [CLIENTE_ROLE], tenantId);

    const customer = await this.db.ecommerceCustomer.create({
      data: {
        userId: user.id,
        email,
        name,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    const tokens = await this.authService.issueTokensForUserId(user.id);
    const welcomeCoupon = await this.assignWelcomeCoupon(customer.id);

    void this.mailClient
      .sendEcommerceMail({
        template: EcommerceMailTemplate.CUSTOMER_WELCOME,
        to: email,
        data: {
          customerName: name,
          storeUrl: this.config.get<string>(
            'ECOMMERCE_STORE_URL',
            this.config.get<string>('FRONTEND_URL', 'http://localhost:3001'),
          ),
          welcomeCouponCode: welcomeCoupon?.code,
          welcomeCouponDescription: welcomeCoupon?.description,
          welcomeCouponDiscountType: welcomeCoupon?.discountType,
          welcomeCouponDiscountValue: welcomeCoupon?.discountValue,
        },
      })
      .catch(() => undefined);

    return { ...tokens, customer, welcomeCoupon };
  }

  async login(dto: LoginCustomerDto): Promise<CustomerAuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByUsernameOrEmail(email);

    if (!user || !user.isEnabled) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    if (!roles.includes(CLIENTE_ROLE)) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      this.normalizePasswordHash(user.passwordHash),
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const customer = await this.ensureEcommerceCustomer(user.id, email, user.name, user.surname);
    const tokens = await this.authService.issueTokensForUserId(user.id);
    return { ...tokens, customer };
  }

  async getProfile(userId: string): Promise<CustomerAuthProfile> {
    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { userId, isEnabled: true },
      select: { id: true, email: true, name: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Perfil de cliente no encontrado.');
    }

    return customer;
  }

  async updateProfile(
    userId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerAuthProfile> {
    const name = dto.name.trim();
    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { userId, isEnabled: true },
      select: { id: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Perfil de cliente no encontrado.');
    }

    const { name: firstName, surname } = this.splitName(name);

    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { name: firstName, surname },
      }),
      this.db.ecommerceCustomer.update({
        where: { id: customer.id },
        data: { name },
      }),
    ]);

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    await this.authService.changePassword(userId, dto);

    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      return;
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      return;
    }

    await this.db.ecommerceCustomer.update({
      where: { id: customer.id },
      data: { passwordHash: user.passwordHash },
    });
  }

  private async ensureEcommerceCustomer(
    userId: string,
    email: string,
    name: string,
    surname: string,
  ): Promise<CustomerAuthProfile> {
    const existing = await this.db.ecommerceCustomer.findFirst({
      where: { userId },
      select: { id: true, email: true, name: true },
    });

    if (existing) {
      return existing;
    }

    const legacy = await this.db.ecommerceCustomer.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (legacy) {
      return this.db.ecommerceCustomer.update({
        where: { id: legacy.id },
        data: { userId },
        select: { id: true, email: true, name: true },
      });
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    return this.db.ecommerceCustomer.create({
      data: {
        userId,
        email,
        name: [name, surname].filter(Boolean).join(' ').trim() || email,
        passwordHash: user.passwordHash,
      },
      select: { id: true, email: true, name: true },
    });
  }

  private async resolveTenantId(): Promise<string> {
    const tenantId = this.config.get<string>('ECOMMERCE_TENANT_ID')?.trim();
    if (!tenantId) {
      throw new BadRequestException(
        'ECOMMERCE_TENANT_ID no está configurado en auth-service.',
      );
    }

    const tenant = await this.db.tenant.findFirst({
      where: { id: tenantId, isActive: true },
      select: { id: true },
    });

    if (!tenant) {
      throw new BadRequestException('El tenant configurado para ecommerce no existe o está inactivo.');
    }

    return tenant.id;
  }

  private splitName(fullName: string): { name: string; surname: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return { name: 'Cliente', surname: '' };
    }

    return {
      name: parts[0],
      surname: parts.slice(1).join(' '),
    };
  }

  private async buildUniqueUsername(email: string): Promise<string> {
    const base = email.slice(0, 100);
    const existing = await this.db.user.findUnique({ where: { username: base } });
    if (!existing) {
      return base;
    }

    const suffix = Date.now().toString(36).slice(-6);
    return `${base.slice(0, 93)}-${suffix}`;
  }

  private normalizePasswordHash(hash: string): string {
    return hash.replace(/^\$2y\$/, '$2b$');
  }

  private async assignWelcomeCoupon(
    customerId: string,
  ): Promise<CustomerWelcomeCoupon | null> {
    const baseUrl = this.config
      .get<string>('ECOMMERCE_SERVICE_URL', 'http://localhost:3012')
      .replace(/\/$/, '');
    const serviceKey = this.config.get<string>('INTERNAL_SERVICE_KEY', 'nm-internal-dev-key');

    try {
      const response = await fetch(`${baseUrl}/ecommerce/coupons/internal/assign-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': serviceKey,
        },
        body: JSON.stringify({ customerId }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { coupon?: CustomerWelcomeCoupon | null };
      return payload.coupon ?? null;
    } catch {
      return null;
    }
  }
}
