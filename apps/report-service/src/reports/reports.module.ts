import { Module } from '@nestjs/common';
import { DocumentClientModule } from '@app/document-client';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ManagementDashboardService } from './management-dashboard.service';
import { ProductsInventoryPdfService } from './products-inventory-pdf.service';
import { SalesReportPdfService } from './sales-report-pdf.service';

@Module({
  imports: [DocumentClientModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ManagementDashboardService,
    ProductsInventoryPdfService,
    SalesReportPdfService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
