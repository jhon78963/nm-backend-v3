import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsUUID, IsOptional, IsEnum, IsArray,
  ValidateNested, IsNumber, Min, IsInt, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH    = 'CASH',
  YAPE    = 'YAPE',
  PLIN    = 'PLIN',
  CARD    = 'CARD',
  MIXED   = 'MIXED',
}

export enum DocumentType {
  BOLETA  = 'BOLETA',
  FACTURA = 'FACTURA',
  TICKET  = 'TICKET',   // sin documento fiscal
}

export class CheckoutPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Referencia (nro. operación Yape/Plin/tarjeta)' })
  @IsString()
  @IsOptional()
  reference?: string;
}

export class CheckoutItemDto {
  @ApiProperty({ description: 'ID del ProductSize' })
  @IsUUID()
  productSizeId: string;

  @ApiPropertyOptional({ description: 'ID del color. Requerido si el producto tiene colores.' })
  @IsUUID()
  @IsOptional()
  colorId?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Precio de venta unitario al momento del cobro' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}

/**
 * CheckoutDto — Equivale a PosController@checkout de Laravel.
 * El frontend Angular envía esta estructura al hacer "Cobrar" en el POS.
 * El servicio valida stock, descuenta inventario y opcionalmente emite SUNAT.
 */
export class CheckoutDto {
  @ApiProperty({ description: 'ID del almacén donde se procesa la venta' })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'ID del cliente (opcional para tickets sin nombre)' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.TICKET })
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType = DocumentType.TICKET;

  @ApiProperty({ type: [CheckoutItemDto], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ type: [CheckoutPaymentDto], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutPaymentDto)
  payments: CheckoutPaymentDto[];

  @ApiPropertyOptional({ description: 'Notas internas (no aparecen en el ticket)' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'RUC del cliente para FACTURA (requerido si documentType=FACTURA)' })
  @IsString()
  @IsOptional()
  customerRuc?: string;

  @ApiPropertyOptional({ description: 'Razón social del cliente para FACTURA' })
  @IsString()
  @IsOptional()
  customerBusinessName?: string;
}
