import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { KardexModule } from './kardex/kardex.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    InventoryModule,
    PurchasesModule,
    KardexModule,
    ReconciliationModule,
  ],
})
export class AppModule {}
