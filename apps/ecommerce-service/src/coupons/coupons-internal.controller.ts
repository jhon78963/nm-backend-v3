import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@app/common/decorators/public.decorator';

import { AssignWelcomeCouponDto } from './dto/assign-welcome-coupon.dto';
import { CouponsService } from './coupons.service';

@ApiTags('Ecommerce Coupons Internal')
@Controller('ecommerce/coupons/internal')
export class CouponsInternalController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly config: ConfigService,
  ) {}

  @Post('assign-welcome')
  @Public()
  @ApiOperation({ summary: 'Asignar cupón de bienvenida a un cliente (service-to-service)' })
  async assignWelcome(
    @Headers('x-internal-service-key') serviceKey: string | undefined,
    @Body() dto: AssignWelcomeCouponDto,
  ) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_KEY', 'nm-internal-dev-key');
    if (!serviceKey || serviceKey !== expected) {
      throw new UnauthorizedException('No autorizado.');
    }

    const coupon = await this.couponsService.assignWelcomeCoupon(dto.customerId);
    return { coupon };
  }
}
