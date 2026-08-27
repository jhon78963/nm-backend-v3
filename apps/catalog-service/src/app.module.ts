import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ColorsModule } from './colors/colors.module';
import { SizesModule } from './sizes/sizes.module';
import { GendersModule } from './genders/genders.module';
import { WoocommerceModule } from './woocommerce/woocommerce-sync.module';
import { ProductHistoryModule } from './product-history/product-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // @nestjs/schedule para el cron de sincronización WooCommerce
    // equivale al artisan SyncWooCommerceCatalogCommand
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    ProductsModule,
    ColorsModule,
    SizesModule,
    GendersModule,
    WoocommerceModule,
    ProductHistoryModule,
  ],
})
export class AppModule {}
