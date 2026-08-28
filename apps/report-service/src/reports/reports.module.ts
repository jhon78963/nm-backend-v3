import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ManagementDashboardService } from './management-dashboard.service';
import { ProductsInventoryPdfService } from './products-inventory-pdf.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ManagementDashboardService, ProductsInventoryPdfService],
  exports: [ReportsService],
})
export class ReportsModule {}
