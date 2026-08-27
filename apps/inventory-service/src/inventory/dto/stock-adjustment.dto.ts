import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID, IsString, IsNotEmpty, IsNumber, IsOptional,
} from 'class-validator';

/**
 * StockAdjustmentDto — Ajuste manual de inventario (reconciliación física).
 * Equivale a los ajustes de tipo 'ADJUSTMENT' del ledger de Laravel.
 * delta > 0 = ingreso, delta < 0 = salida.
 */
export class StockAdjustmentDto {
  @ApiProperty({ description: 'ID del almacén' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'ID del ProductSize (talla+producto)' })
  @IsUUID()
  productSizeId: string;

  @ApiProperty({ description: 'ID del color' })
  @IsUUID()
  colorId: string;

  @ApiProperty({
    description: 'Cantidad a ajustar (positivo = entrada, negativo = salida)',
    example: -3,
  })
  @IsNumber({ maxDecimalPlaces: 0 })
  delta: number;

  @ApiPropertyOptional({
    description: 'Tipo de movimiento (default: ADJUSTMENT)',
    example: 'ADJUSTMENT',
    default: 'ADJUSTMENT',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  movementType?: string;

  @ApiPropertyOptional({ description: 'UUID de la entidad que origina el ajuste (venta, devolución…)' })
  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Sale' })
  @IsString()
  @IsOptional()
  referenceType?: string;
}
