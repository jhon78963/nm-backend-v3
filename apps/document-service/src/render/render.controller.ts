import {
  Body, Controller, Header, Post, StreamableFile, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentServiceKeyGuard } from '../guards/document-service-key.guard';
import { RenderExcelDto } from './dto/render-excel.dto';
import { RenderPdfDto } from './dto/render-pdf.dto';
import { RenderService } from './render.service';

@ApiTags('Render')
@UseGuards(DocumentServiceKeyGuard)
@Controller({ path: 'render', version: '1' })
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  @Post('pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Renderizar plantilla Handlebars a PDF (service-to-service)' })
  async renderPdf(@Body() dto: RenderPdfDto): Promise<StreamableFile> {
    const buffer = await this.renderService.renderPdf(dto.templateName, dto.data);

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${dto.templateName}.pdf"`,
    });
  }

  @Post('excel')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Generar hoja de cálculo Excel (service-to-service)' })
  async renderExcel(@Body() dto: RenderExcelDto): Promise<StreamableFile> {
    const buffer = await this.renderService.renderExcel(dto.columns, dto.rows);

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="report.xlsx"',
    });
  }
}
