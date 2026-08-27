import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiProxyModule } from './ai-proxy/ai-proxy.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    DashboardModule,
    AiProxyModule,
    ReportsModule,
  ],
})
export class AppModule {}
