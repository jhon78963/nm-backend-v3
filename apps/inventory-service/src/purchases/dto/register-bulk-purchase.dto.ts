import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum,
  IsNumber, Min, IsArray, ValidateNested, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseCurrency {
  PEN = 'PEN',
  USD = 'USD',
}

export class PurchaseLineColorDeltaDto {
  @ApiProperty()
  @IsUUID()
  colorId: string;

  @ApiProperty({ description: 'Unidades de este color ingresadas' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class PurchaseLineDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsUUID()
  sizeId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  productSizeId?: string;

  @ApiProperty({ description: 'Precio de compra por unidad' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  purchasePrice: number;

  @ApiPropertyOptional({ description: 'Precio de venta sugerido' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiProperty({ description: 'Total de unidades de esta línea' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Desglose por color. Si se omite, el stock va a color "Sin color".',
    type: [PurchaseLineColorDeltaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineColorDeltaDto)
  @IsOptional()
  colorDeltas?: PurchaseLineColorDeltaDto[];
}

/**
 * RegisterBulkPurchaseDto — Equivale a PurchaseBulkService@registerBulk de Laravel.
 * En el original, una sola llamada registra la cabecera de compra + múltiples líneas
 * + ajusta el inventario (ledger) en una única transacción DB.
 */
export class RegisterBulkPurchaseDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Nombre de proveedor libre (si no está en catálogo)' })
  @IsString()
  @IsOptional()
  supplierName?: string;

  @ApiPropertyOptional({ enum: PurchaseCurrency, default: PurchaseCurrency.PEN })
  @IsEnum(PurchaseCurrency)
  @IsOptional()
  currency?: PurchaseCurrency = PurchaseCurrency.PEN;

  @ApiPropertyOptional({ description: 'Tipo de cambio (solo si currency=USD)' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(1)
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Fecha de la compra (default: ahora)' })
  @IsString()
  @IsOptional()
  purchaseDate?: string;

  @ApiProperty({ type: [PurchaseLineDto], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines: PurchaseLineDto[];
}
