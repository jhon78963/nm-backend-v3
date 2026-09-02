import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
