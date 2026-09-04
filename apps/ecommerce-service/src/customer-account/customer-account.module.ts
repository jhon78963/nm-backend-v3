import { Module } from '@nestjs/common';

import { CouponsModule } from '../coupons/coupons.module';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { CustomerAccountController } from './customer-account.controller';
import { CustomerAccountService } from './customer-account.service';

@Module({
  imports: [CustomerAuthModule, CouponsModule],
  controllers: [CustomerAccountController],
  providers: [CustomerAccountService],
})
export class CustomerAccountModule {}
