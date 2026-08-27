import { Module } from '@nestjs/common';
import { SunatService } from './sunat.service';
import { DocumentSeriesService } from './document-series.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  providers: [SunatService, DocumentSeriesService],
  exports: [SunatService, DocumentSeriesService],
})
export class SunatModule {}
