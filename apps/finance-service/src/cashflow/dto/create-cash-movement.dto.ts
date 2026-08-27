import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, Min,
  MaxLength, IsOptional, IsUUID, IsDateString,
} from 'class-validator';

export enum MovementType {
  INCOME  = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum CashPaymentMethod {
  CASH    = 'CASH',
  YAPE    = 'YAPE',
  PLIN    = 'PLIN',
  CARD    = 'CARD',
  TRANSFER = 'TRANSFER',
}

/**
 * CreateCashMovementDto — Equivale al CashflowRequest de Laravel.
 * Los gastos e ingresos manuales (distintos de ventas y pagos de compras)
 * se registran aquí. Tras la unificación de expenses en cash_movements,
 * todo flujo monetario pasa por esta tabla.
 */
export class CreateCashMovementDto {
  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Pago de alquiler', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({ enum: CashPaymentMethod })
  @IsEnum(CashPaymentMethod)
  paymentMethod: CashPaymentMethod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Fecha de la transacción (ISO 8601)', example: '2026-08-25' })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Mes contable en formato YYYY-MM (puede diferir del mes de la fecha)',
    example: '2026-08',
  })
  @IsString()
  @IsNotEmpty()
  accountingMonth: string;

  @ApiPropertyOptional({ description: 'ID de compra asociada (para pagos a proveedores)' })
  @IsUUID()
  @IsOptional()
  purchaseId?: string;
}
