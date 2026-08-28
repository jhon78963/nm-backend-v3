import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { CheckoutModule } from './checkout/checkout.module';
import { SalesModule } from './sales/sales.module';
import { TicketsModule } from './tickets/tickets.module';
import { SunatModule } from './sunat/sunat.module';
import { FiscalModule } from './fiscal/fiscal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    AuthModule,
    CheckoutModule,
    SalesModule,
    TicketsModule,
    SunatModule,
    FiscalModule,
  ],
})
export class AppModule {}
