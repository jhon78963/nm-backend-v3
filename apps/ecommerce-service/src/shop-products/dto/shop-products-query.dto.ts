import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum ShopProductSortField {
  FEATURED = 'featured',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
}

export class ShopProductsQueryDto {
  @ApiProperty({ example: 'ninos', description: 'Slug de la colección' })
  @IsString()
  @IsNotEmpty()
  collectionSlug!: string;

  @ApiProperty({ description: 'UUID del almacén del tenant' })
  @IsUUID('all')
  warehouseId!: string;

  @ApiPropertyOptional({
    example: 'uuid-1,uuid-2',
    description: 'IDs de talla separados por coma',
  })
  @IsOptional()
  @IsString()
  sizeIds?: string;

  @ApiPropertyOptional({
    example: 'uuid-1,uuid-2',
    description: 'IDs de color separados por coma',
  })
  @IsOptional()
  @IsString()
  colorIds?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 'polo',
    description: 'Texto libre (nombre, código de barras, descripción corta)',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo productos en oferta (isOnSale, precio oferta o descuentos)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ enum: ShopProductSortField, default: ShopProductSortField.FEATURED })
  @IsOptional()
  @IsEnum(ShopProductSortField)
  sort?: ShopProductSortField = ShopProductSortField.FEATURED;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 12;
}
