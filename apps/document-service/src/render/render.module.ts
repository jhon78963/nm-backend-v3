import { Module } from '@nestjs/common';
import { PdfGeneratorService } from '../generators/pdf.generator.service';
import { ExcelGeneratorService } from '../generators/excel.generator.service';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';

@Module({
  controllers: [RenderController],
  providers: [RenderService, PdfGeneratorService, ExcelGeneratorService],
  exports: [RenderService],
})
export class RenderModule {}
