import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DatabaseService } from '@app/database';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import {
  buildMasterStockByProductSizeId,
  readColorStock,
} from '@app/common/utils/product-inventory.util';

const HEADERS = [
  'Talla',
  'Cód. barras',
  'P. Compra',
  'P. Venta',
  'P. Venta Mín.',
  'Stock Tallas',
  'Código Color',
  'Colores',
  'Stock Actual',
  'Stock Nuevo',
] as const;

const LAST_VISIBLE_COL = 10;
const COL_PS_ID = 11;
const COL_COLOR_ID = 12;

@Injectable()
export class ProductExportService {
  constructor(private readonly db: DatabaseService) {}

  async export(
    warehouseIdParam: string | undefined,
    user: AuthenticatedUser,
  ): Promise<Buffer> {
    const warehouseId = this.resolveWarehouseId(warehouseIdParam, user);

    const products = await this.db.product.findMany({
      where: { isDeleted: false, warehouseId },
      orderBy: { name: 'asc' },
      include: {
        productSizes: {
          where: { isDeleted: false },
          orderBy: { id: 'asc' },
          include: {
            size: { select: { description: true } },
            productSizeColors: {
              include: {
                color: { select: { id: true, description: true } },
              },
            },
          },
        },
      },
    });

    const productSizeIds = products.flatMap((product) =>
      product.productSizes.map((size) => size.id),
    );
    const masterStockBySizeId = await buildMasterStockByProductSizeId(
      this.db,
      warehouseId,
      productSizeIds,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Productos');

    sheet.getColumn(COL_PS_ID).hidden = true;
    sheet.getColumn(COL_COLOR_ID).hidden = true;

    let row = 1;

    for (const product of products) {
      sheet.mergeCells(row, 1, row, LAST_VISIBLE_COL);
      const titleCell = sheet.getCell(row, 1);
      titleCell.value = product.name;
      this.styleProductName(sheet, row);
      row++;

      HEADERS.forEach((header, index) => {
        sheet.getCell(row, index + 1).value = header;
      });
      this.styleHeaders(sheet, row);
      row++;

      for (const productSize of product.productSizes) {
        const sizeName = productSize.size?.description ?? '';
        const colors = productSize.productSizeColors;
        const sizeStock = masterStockBySizeId.get(productSize.id) ?? 0;

        if (colors.length === 0) {
          this.writeDataRow(sheet, row, {
            talla: sizeName,
            barcode: productSize.barcode ?? '',
            purchasePrice: Number(productSize.purchasePrice),
            salePrice: Number(productSize.salePrice),
            minSalePrice: productSize.minSalePrice
              ? Number(productSize.minSalePrice)
              : '',
            stockTallas: sizeStock,
            colorCode: '',
            colorName: '',
            stockActual: sizeStock,
            productSizeId: productSize.id,
            colorId: '',
          });
          row++;
        } else {
          const firstRow = row;

          for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
            const colorLink = colors[colorIndex];
            const colorStock = await readColorStock(
              this.db,
              warehouseId,
              productSize.id,
              colorLink.colorId,
            );

            this.writeDataRow(sheet, row, {
              talla: colorIndex === 0 ? sizeName : '',
              barcode: colorIndex === 0 ? (productSize.barcode ?? '') : '',
              purchasePrice:
                colorIndex === 0 ? Number(productSize.purchasePrice) : '',
              salePrice: colorIndex === 0 ? Number(productSize.salePrice) : '',
              minSalePrice:
                colorIndex === 0 && productSize.minSalePrice
                  ? Number(productSize.minSalePrice)
                  : '',
              stockTallas: colorIndex === 0 ? sizeStock : '',
              colorCode: colorLink.color.id,
              colorName: colorLink.color.description,
              stockActual: colorStock,
              productSizeId: productSize.id,
              colorId: colorLink.color.id,
            });
            row++;
          }

          if (colors.length > 1) {
            for (let col = 1; col <= 6; col++) {
              sheet.mergeCells(firstRow, col, row - 1, col);
              sheet.getCell(firstRow, col).alignment = {
                ...sheet.getCell(firstRow, col).alignment,
                vertical: 'middle',
              };
            }
          }
        }
      }

      row++;
    }

    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 14;
    sheet.getColumn(6).width = 14;
    sheet.getColumn(7).width = 14;
    sheet.getColumn(8).width = 20;
    sheet.getColumn(9).width = 14;
    sheet.getColumn(10).width = 14;
    sheet.getColumn(COL_PS_ID).width = 0;
    sheet.getColumn(COL_COLOR_ID).width = 0;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private resolveWarehouseId(
    warehouseIdParam: string | undefined,
    user: AuthenticatedUser,
  ): string {
    const warehouseId = warehouseIdParam?.trim() || user.warehouseId;

    if (!warehouseId) {
      throw new BadRequestException('No se pudo determinar el almacén.');
    }

    if (
      warehouseIdParam &&
      !user.roles.includes('Super Admin') &&
      warehouseIdParam !== user.warehouseId
    ) {
      throw new ForbiddenException('No tienes acceso al almacén especificado.');
    }

    return warehouseId;
  }

  private writeDataRow(
    sheet: ExcelJS.Worksheet,
    row: number,
    data: {
      talla: string;
      barcode: string;
      purchasePrice: number | '';
      salePrice: number | '';
      minSalePrice: number | '';
      stockTallas: number | '';
      colorCode: string;
      colorName: string;
      stockActual: number;
      productSizeId: string;
      colorId: string;
    },
  ): void {
    sheet.getCell(row, 1).value = data.talla;

    const barcodeCell = sheet.getCell(row, 2);
    barcodeCell.value = data.barcode;
    barcodeCell.numFmt = '@';

    sheet.getCell(row, 3).value = data.purchasePrice;
    sheet.getCell(row, 4).value = data.salePrice;
    sheet.getCell(row, 5).value = data.minSalePrice;
    sheet.getCell(row, 6).value = data.stockTallas;
    sheet.getCell(row, 7).value = data.colorCode;
    sheet.getCell(row, 8).value = data.colorName;
    sheet.getCell(row, 9).value = data.stockActual;
    sheet.getCell(row, 10).value = '';
    sheet.getCell(row, COL_PS_ID).value = data.productSizeId;
    sheet.getCell(row, COL_COLOR_ID).value = data.colorId;

    for (let col = 1; col <= LAST_VISIBLE_COL; col++) {
      sheet.getCell(row, col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  private styleProductName(sheet: ExcelJS.Worksheet, row: number): void {
    const range = sheet.getRow(row);
    range.height = 22;
    range.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    range.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };
    range.alignment = { horizontal: 'left', vertical: 'middle' };
    range.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  private styleHeaders(sheet: ExcelJS.Worksheet, row: number): void {
    const headerRow = sheet.getRow(row);
    headerRow.height = 18;
    headerRow.font = { bold: true, color: { argb: 'FF1E3A5F' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    headerRow.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    for (let col = 1; col <= LAST_VISIBLE_COL; col++) {
      headerRow.getCell(col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }
}
