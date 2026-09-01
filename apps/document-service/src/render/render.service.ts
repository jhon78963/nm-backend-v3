import { Injectable } from '@nestjs/common';
import { PdfGeneratorService } from '../generators/pdf.generator.service';
import {
  ExcelColumnDefinition,
  ExcelGeneratorService,
  ExcelRow,
} from '../generators/excel.generator.service';

@Injectable()
export class RenderService {
  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  renderPdf(templateName: string, data: unknown): Promise<Buffer> {
    return this.pdfGenerator.generatePdf(templateName, data);
  }

  renderExcel(columns: ExcelColumnDefinition[], rows: ExcelRow[]): Promise<Buffer> {
    return this.excelGenerator.generateExcel(columns, rows);
  }
}
