import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReconciliationColorStockDto {
  @IsUUID()
  colorId: string;

  @IsInt()
  @Min(0)
  stock: number;
}

export class ReconciliationSizeUpdateDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  barcode?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minSalePrice?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationColorStockDto)
  colors?: ReconciliationColorStockDto[];
}

export class BulkUpdateReconciliationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationSizeUpdateDto)
  sizes: ReconciliationSizeUpdateDto[];
}
