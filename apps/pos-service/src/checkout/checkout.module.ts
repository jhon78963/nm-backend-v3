import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { SunatModule } from '../sunat/sunat.module';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule, SunatModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
