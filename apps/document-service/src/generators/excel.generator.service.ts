import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

export interface ExcelColumnDefinition {
  key: string;
  header?: string;
  label?: string;
  width?: number;
}

export type ExcelRow = Record<string, string | number | boolean | null | undefined>;

@Injectable()
export class ExcelGeneratorService {
  async generateExcel(
    columns: ExcelColumnDefinition[],
    rows: ExcelRow[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = columns.map((column) => ({
      header: column.header ?? column.label ?? column.key,
      key: column.key,
      width: column.width ?? 15,
    }));

    worksheet.addRows(rows);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
