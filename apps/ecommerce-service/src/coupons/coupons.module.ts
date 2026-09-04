import { Module } from '@nestjs/common';

import { CouponsAdminController } from './coupons-admin.controller';
import { CouponsInternalController } from './coupons-internal.controller';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  controllers: [CouponsController, CouponsAdminController, CouponsInternalController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
