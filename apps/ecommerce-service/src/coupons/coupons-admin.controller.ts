import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@app/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

import { CreateCouponDto, UpdateCouponDto } from './dto/create-coupon.dto';
import { CouponsService } from './coupons.service';

@ApiTags('Ecommerce Coupons Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Super Admin')
@Controller('ecommerce/coupons/admin')
export class CouponsAdminController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cupones (admin)' })
  list() {
    return this.couponsService.listAdminCoupons();
  }

  @Post()
  @ApiOperation({ summary: 'Crear cupón (admin)' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cupón (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.updateCoupon(id, dto);
  }
}
