import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdatePurchaseLineColorDeltaDto {
  @ApiProperty()
  @IsUUID()
  colorId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdatePurchaseLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string | null;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalePrice?: number | null;

  @ApiPropertyOptional({ type: [UpdatePurchaseLineColorDeltaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseLineColorDeltaDto)
  colorDeltas?: UpdatePurchaseLineColorDeltaDto[];

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sizeOnlyQuantity?: number;
}
