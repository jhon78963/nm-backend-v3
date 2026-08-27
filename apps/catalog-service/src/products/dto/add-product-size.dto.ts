import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional } from 'class-validator';
import { CreateProductSizeDto } from './create-product.dto';

export class AddProductSizeDto extends OmitType(CreateProductSizeDto, [
  'purchasePrice',
  'salePrice',
] as const) {
  @ApiPropertyOptional({ description: 'Precio de compra en soles' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Precio de venta estándar' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  salePrice?: number;
}

export class UpdateProductSizeDto extends PartialType(
  OmitType(CreateProductSizeDto, ['sizeId'] as const),
) {}
