import { Module } from '@nestjs/common';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';
import { AiProductContextService } from './ai-product-context.service';
import { AiStockAgingService } from './ai-stock-aging.service';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [ReportsModule],
  controllers: [AiProxyController],
  providers: [AiProxyService, AiProductContextService, AiStockAgingService],
  exports: [AiProxyService],
})
export class AiProxyModule {}
