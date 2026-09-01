import { IsArray } from 'class-validator';
import type { ExcelColumnDefinition, ExcelRow } from '../../generators/excel.generator.service';

export class RenderExcelDto {
  @IsArray()
  columns!: ExcelColumnDefinition[];

  @IsArray()
  rows!: ExcelRow[];
}
