import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@app/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

import { AdminCustomersService } from './admin-customers.service';
import { ListAdminCustomerOrdersQueryDto } from './dto/list-admin-customer-orders-query.dto';
import { ListAdminCustomersQueryDto } from './dto/list-admin-customers-query.dto';
import { UpdateAdminRefundDto } from './dto/update-admin-refund.dto';
import { UpdateAdminCustomerDto } from './dto/update-admin-customer.dto';

@ApiTags('Ecommerce Customers Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Super Admin')
@Controller('ecommerce/customers/admin')
export class AdminCustomersController {
  constructor(private readonly adminCustomersService: AdminCustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del ecommerce (admin)' })
  listCustomers(@Query() query: ListAdminCustomersQueryDto) {
    return this.adminCustomersService.listAdminCustomers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cliente del ecommerce (admin)' })
  getCustomer(@Param('id') id: string) {
    return this.adminCustomersService.getAdminCustomer(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente del ecommerce (admin)' })
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateAdminCustomerDto) {
    return this.adminCustomersService.updateAdminCustomer(id, dto);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Pedidos de un cliente (admin)' })
  listCustomerOrders(
    @Param('id') id: string,
    @Query() query: ListAdminCustomerOrdersQueryDto,
  ) {
    return this.adminCustomersService.listCustomerOrders(id, query);
  }

  @Get(':id/refunds')
  @ApiOperation({ summary: 'Reembolsos de un cliente (admin)' })
  listCustomerRefunds(@Param('id') id: string) {
    return this.adminCustomersService.listCustomerRefunds(id);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Reseñas de un cliente (admin)' })
  listCustomerReviews(@Param('id') id: string) {
    return this.adminCustomersService.listCustomerReviews(id);
  }

  @Get(':id/notifications')
  @ApiOperation({ summary: 'Notificaciones de un cliente (admin)' })
  listCustomerNotifications(@Param('id') id: string) {
    return this.adminCustomersService.listCustomerNotifications(id);
  }
}

@ApiTags('Ecommerce Refunds Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Super Admin')
@Controller('ecommerce/refunds/admin')
export class AdminRefundsController {
  constructor(private readonly adminCustomersService: AdminCustomersService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar reembolso (admin)' })
  updateRefund(@Param('id') id: string, @Body() dto: UpdateAdminRefundDto) {
    return this.adminCustomersService.updateAdminRefund(id, dto);
  }
}
