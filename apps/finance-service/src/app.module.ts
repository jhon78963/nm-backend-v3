import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { CashflowModule } from './cashflow/cashflow.module';
import { AccumulatedModule } from './accumulated/accumulated.module';
import { FinancialSummaryModule } from './financial-summary/financial-summary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    CashflowModule,
    AccumulatedModule,
    FinancialSummaryModule,
  ],
})
export class AppModule {}
