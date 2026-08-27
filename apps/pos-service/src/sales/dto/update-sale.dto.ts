import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateSaleItemDto {
  @ApiPropertyOptional({ description: 'UUID del detalle existente' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 45.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price!: number;

  @ApiPropertyOptional({ description: 'UUID de product_size (requerido en ítems nuevos)' })
  @IsOptional()
  @IsUUID()
  product_size_id?: string;

  @ApiPropertyOptional({ description: 'UUID del color' })
  @IsOptional()
  @IsUUID()
  color_id?: string;
}

export class UpdateSalePaymentDto {
  @ApiPropertyOptional({ example: 'CASH' })
  @IsString()
  method!: string;

  @ApiPropertyOptional({ example: 45.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class UpdateSaleDto {
  /** Campos enviados por el frontend legacy; se ignoran en el servidor. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2026-08-27T10:30:00.000Z' })
  @IsOptional()
  @IsString()
  creationTime?: string;

  @ApiPropertyOptional({ type: [UpdateSaleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleItemDto)
  items?: UpdateSaleItemDto[];

  @ApiPropertyOptional({ type: [UpdateSalePaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSalePaymentDto)
  payments?: UpdateSalePaymentDto[];
}
