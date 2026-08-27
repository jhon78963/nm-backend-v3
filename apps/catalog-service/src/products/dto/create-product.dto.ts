import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsBoolean,
  IsUUID, IsArray, ValidateNested, IsNumber,
  Min, MaxLength, IsEnum, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WooStatus {
  DRAFT     = 'draft',
  PUBLISH   = 'publish',
  PRIVATE   = 'private',
}

export class CreateProductSizeDto {
  @ApiProperty()
  @IsUUID()
  sizeId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ description: 'Precio de compra en soles' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice: number;

  @ApiProperty({ description: 'Precio de venta estándar' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice: number;

  @ApiPropertyOptional({ description: 'Precio mínimo de venta (outlet)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minSalePrice?: number;

  @ApiPropertyOptional({
    description: 'Stock maestro de la talla (solo si aún no tiene colores asignados).',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ description: 'IDs de colores disponibles para esta talla' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  colorIds?: string[];
}

/**
 * CreateProductDto — Equivale al ProductRequest de Laravel +
 * la lógica de ProductService@create que maneja sizes en la misma transacción.
 */
export class CreateProductDto {
  @ApiProperty({ example: 'Polo Cuello Redondo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '7501234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({ description: 'ID del género (Hombre/Mujer/Niño)' })
  @IsUUID()
  genderId: string;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ description: 'ID del almacén' })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isOnSale?: boolean;

  @ApiPropertyOptional({ enum: WooStatus, default: WooStatus.DRAFT })
  @IsEnum(WooStatus)
  @IsOptional()
  wooStatus?: WooStatus;

  @ApiPropertyOptional({ example: 'active' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  percentageDiscount?: string | number;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  cashDiscount?: number;

  @ApiPropertyOptional({ type: [CreateProductSizeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSizeDto)
  @IsOptional()
  sizes?: CreateProductSizeDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Polo Cuello Redondo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '7501234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  genderId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isOnSale?: boolean;

  @ApiPropertyOptional({ enum: WooStatus })
  @IsEnum(WooStatus)
  @IsOptional()
  wooStatus?: WooStatus;

  @ApiPropertyOptional({ example: 'active' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  percentageDiscount?: string | number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  cashDiscount?: number;
}
