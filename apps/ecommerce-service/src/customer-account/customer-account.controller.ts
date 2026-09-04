import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator';
import type { AuthenticatedCustomer } from '../customer-auth/types/authenticated-customer.type';
import { CustomerAccountService } from './customer-account.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpsertCustomerAddressDto } from './dto/upsert-customer-address.dto';

@ApiTags('Ecommerce Customer Account')
@Controller('ecommerce/customer')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class CustomerAccountController {
  constructor(
    private readonly customerAccountService: CustomerAccountService,
    private readonly couponsService: CouponsService,
  ) {}

  @Get('coupons/welcome')
  @ApiOperation({ summary: 'Obtener cupón de bienvenida disponible del cliente' })
  getWelcomeCoupon(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.couponsService.getWelcomeCouponForCustomer(customer.id);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Listar direcciones guardadas del cliente' })
  listAddresses(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerAccountService.listAddresses(customer.id);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear dirección guardada' })
  createAddress(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: UpsertCustomerAddressDto,
  ) {
    return this.customerAccountService.createAddress(customer.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Actualizar dirección guardada' })
  updateAddress(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('id') addressId: string,
    @Body() dto: UpsertCustomerAddressDto,
  ) {
    return this.customerAccountService.updateAddress(customer.id, addressId, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar dirección guardada' })
  async deleteAddress(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('id') addressId: string,
  ) {
    await this.customerAccountService.deleteAddress(customer.id, addressId);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Obtener preferencias de notificación' })
  getNotificationSettings(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerAccountService.getNotificationSettings(customer.id);
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: 'Actualizar preferencias de notificación' })
  updateNotificationSettings(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.customerAccountService.updateNotificationSettings(customer.id, dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Listar notificaciones del cliente' })
  listNotifications(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerAccountService.listNotifications(customer.id);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  markNotificationRead(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('id') notificationId: string,
  ) {
    return this.customerAccountService.markNotificationRead(customer.id, notificationId);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  markAllNotificationsRead(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerAccountService.markAllNotificationsRead(customer.id);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Listar solicitudes de reembolso del cliente' })
  listRefunds(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerAccountService.listRefunds(customer.id);
  }

  @Post('refunds')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Solicitar reembolso de un pedido' })
  createRefund(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: CreateRefundRequestDto,
  ) {
    return this.customerAccountService.createRefund(customer.id, dto);
  }
}
