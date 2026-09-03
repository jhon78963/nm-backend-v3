import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/common/decorators/public.decorator';

import { CustomerAuthService } from './customer-auth.service';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { CustomerJwtAuthGuard } from './guards/customer-jwt.guard';
import type { AuthenticatedCustomer } from './types/authenticated-customer.type';

@ApiTags('Ecommerce Customer Auth (deprecated)')
@Controller('ecommerce/customers/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.GONE)
  @ApiOperation({ summary: 'Deprecated — usar POST /v1/auth/customer/register' })
  register(@Body() _dto: RegisterCustomerDto) {
    return this.customerAuthService.register();
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.GONE)
  @ApiOperation({ summary: 'Deprecated — usar POST /v1/auth/customer/login' })
  login(@Body() _dto: LoginCustomerDto) {
    return this.customerAuthService.login();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(CustomerJwtAuthGuard)
  @ApiOperation({ summary: 'Perfil del cliente (JWT auth-service con rol Cliente)' })
  me(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return customer;
  }
}
