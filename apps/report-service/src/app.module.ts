import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiProxyModule } from './ai-proxy/ai-proxy.module';
import { ReportsModule } from './reports/reports.module';
import { FinancialSummaryModule } from './financial-summary/financial-summary.module';
import { CashflowReportsModule } from './cashflow-reports/cashflow-reports.module';
import { HealthModule } from '@app/common/health/health.module';
import { PermissionsModule } from '@app/common/auth/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    PermissionsModule,
    AuthModule,
    DashboardModule,
    AiProxyModule,
    ReportsModule,
    FinancialSummaryModule,
    CashflowReportsModule,
  ],
})
export class AppModule {}
