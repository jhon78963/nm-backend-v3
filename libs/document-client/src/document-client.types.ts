export interface ExcelColumnDefinition {
  key: string;
  header?: string;
  label?: string;
  width?: number;
}

export type ExcelRow = Record<string, string | number | boolean | null | undefined>;
