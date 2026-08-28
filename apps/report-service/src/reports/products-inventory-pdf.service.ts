import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { ReportsService } from './reports.service';

interface InventoryColor {
  color_id: string;
  color: string;
  stock: number;
}

interface InventorySize {
  product_size_id: string;
  size_id: string;
  size: string;
  barcode: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  min_sale_price: number | null;
  stock: number;
  colors: InventoryColor[];
}

interface InventoryProduct {
  id: string;
  name: string;
  sizes: InventorySize[];
}

@Injectable()
export class ProductsInventoryPdfService {
  constructor(private readonly reportsService: ReportsService) {}

  async generate(warehouseId: string): Promise<Buffer> {
    const products = await this.reportsService.getProductsInventory(warehouseId);
    const generatedAt = dayjs().format('DD/MM/YYYY HH:mm');

    return this.buildPdf(products, generatedAt);
  }

  private buildPdf(products: InventoryProduct[], generatedAt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 28,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageBottom = doc.page.height - doc.page.margins.bottom;

      const ensureSpace = (height: number) => {
        if (doc.y + height > pageBottom) {
          doc.addPage({ layout: 'landscape', size: 'A4', margin: 28 });
        }
      };

      doc.fontSize(14).text('Reporte de productos — tallas y colores', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#444444').text(
        `Generado: ${generatedAt} · «Stock colores» = suma de stocks por color (debe coincidir con «Stock talla»).`,
      );
      doc.moveDown(0.8);
      doc.fillColor('#111111');

      const columns = [
        { label: 'Talla', width: 52 },
        { label: 'Código barras', width: 95 },
        { label: 'P. compra', width: 58, align: 'right' as const },
        { label: 'P. venta', width: 58, align: 'right' as const },
        { label: 'P. venta mín.', width: 62, align: 'right' as const },
        { label: 'Stock talla', width: 58, align: 'right' as const },
        { label: 'Colores', width: 250 },
        { label: 'Stock colores', width: 70, align: 'right' as const },
      ];

      const drawTableHeader = () => {
        ensureSpace(22);
        const headerY = doc.y;
        let x = doc.page.margins.left;

        doc.rect(x, headerY, columns.reduce((sum, col) => sum + col.width, 0), 16)
          .fill('#e8e8e8');
        doc.fillColor('#111111').fontSize(8).font('Helvetica-Bold');

        for (const column of columns) {
          doc.text(column.label, x + 4, headerY + 4, {
            width: column.width - 8,
            align: column.align ?? 'left',
            lineBreak: false,
          });
          x += column.width;
        }

        doc.y = headerY + 18;
        doc.font('Helvetica');
      };

      drawTableHeader();

      for (const product of products) {
        ensureSpace(20);
        const productY = doc.y;
        const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

        doc.rect(doc.page.margins.left, productY, tableWidth, 14).fill('#e8eaf6');
        doc.fillColor('#111111').fontSize(9).font('Helvetica-Bold')
          .text(product.name, doc.page.margins.left + 4, productY + 3, {
            width: tableWidth - 8,
            lineBreak: false,
          });
        doc.font('Helvetica');
        doc.y = productY + 16;

        if (product.sizes.length === 0) {
          this.drawSizeRow(doc, columns, {
            size: '—',
            barcode: '—',
            purchase_price: null,
            sale_price: null,
            min_sale_price: null,
            stock: null,
            colorsLabel: '—',
            colorsStockSum: null,
            mismatch: false,
          }, ensureSpace, pageBottom);
          continue;
        }

        for (const size of product.sizes) {
          const colors = size.colors ?? [];
          const colorsStockSum = colors.length
            ? colors.reduce((sum, color) => sum + color.stock, 0)
            : null;
          const colorsLabel = colors.length
            ? colors.map((color) => `${color.stock} ${color.color}`).join(', ')
            : '—';
          const mismatch = colorsStockSum !== null && colorsStockSum !== size.stock;

          this.drawSizeRow(doc, columns, {
            size: size.size,
            barcode: size.barcode?.trim() ? size.barcode : '—',
            purchase_price: size.purchase_price,
            sale_price: size.sale_price,
            min_sale_price: size.min_sale_price,
            stock: size.stock,
            colorsLabel,
            colorsStockSum,
            mismatch,
          }, ensureSpace, pageBottom);
        }
      }

      doc.end();
    });
  }

  private drawSizeRow(
    doc: InstanceType<typeof PDFDocument>,
    columns: Array<{ label: string; width: number; align?: 'left' | 'right' }>,
    row: {
      size: string;
      barcode: string;
      purchase_price: number | null;
      sale_price: number | null;
      min_sale_price: number | null;
      stock: number | null;
      colorsLabel: string;
      colorsStockSum: number | null;
      mismatch: boolean;
    },
    ensureSpace: (height: number) => void,
    pageBottom: number,
  ): void {
    const values = [
      row.size,
      row.barcode,
      formatMoney(row.purchase_price),
      formatMoney(row.sale_price),
      formatMoney(row.min_sale_price),
      row.stock !== null ? String(row.stock) : '—',
      row.colorsLabel,
      row.colorsStockSum !== null ? String(row.colorsStockSum) : '—',
    ];

    const rowHeight = Math.max(
      14,
      ...values.map((value, index) =>
        doc.heightOfString(value, {
          width: columns[index].width - 8,
          align: columns[index].align ?? 'left',
        }) + 6,
      ),
    );

    if (doc.y + rowHeight > pageBottom) {
      doc.addPage({ layout: 'landscape', size: 'A4', margin: 28 });
    }

    const rowY = doc.y;
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const fill = row.mismatch ? '#fff3e0' : '#ffffff';

    doc.rect(doc.page.margins.left, rowY, tableWidth, rowHeight).fill(fill);
    doc.fillColor('#111111').fontSize(8);

    let x = doc.page.margins.left;
    values.forEach((value, index) => {
      const column = columns[index];
      doc.text(value, x + 4, rowY + 3, {
        width: column.width - 8,
        align: column.align ?? 'left',
      });
      x += column.width;
    });

    doc.y = rowY + rowHeight;
  }
}

function formatMoney(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
