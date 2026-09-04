import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/common/decorators/public.decorator';
import { resolveClientIp } from '@app/common/utils/client-ip.util';

import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponsService } from './coupons.service';

@ApiTags('Ecommerce Coupons')
@Controller('ecommerce/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ publicProducts: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Validar cupón de descuento para checkout' })
  validate(
    @Body() dto: ValidateCouponDto,
    @Req() request: { headers: Record<string, string | string[] | undefined> },
  ) {
    return this.couponsService.validateCoupon({
      ...dto,
      clientIp: dto.clientIp ?? resolveClientIp(request.headers),
    });
  }
}
