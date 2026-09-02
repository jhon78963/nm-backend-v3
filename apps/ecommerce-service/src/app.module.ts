import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from '@app/common/auth/auth.module';
import { HealthModule } from '@app/common/health/health.module';
import { DatabaseModule } from '@app/database';

import { HeaderModule } from './header/header.module';
import { BannerModule } from './banner/banner.module';
import { HeroSlideModule } from './hero-slide/hero-slide.module';
import { FooterModule } from './footer/footer.module';
import { ServicesSectionModule } from './services-section/services-section.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    HeaderModule,
    BannerModule,
    HeroSlideModule,
    FooterModule,
    ServicesSectionModule,
  ],
})
export class AppModule {}
