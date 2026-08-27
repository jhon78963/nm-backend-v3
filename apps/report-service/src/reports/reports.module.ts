import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ManagementDashboardService } from './management-dashboard.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ManagementDashboardService],
})
export class ReportsModule {}
