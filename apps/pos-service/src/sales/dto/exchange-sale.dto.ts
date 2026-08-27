import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ExchangeNewItemDto {
  @ApiProperty({ description: 'UUID de product_size' })
  @IsUUID()
  product_size_id!: string;

  @ApiProperty({ description: 'UUID del color' })
  @IsUUID()
  color_id!: string;

  @ApiProperty({ example: 45.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  final_price!: number;
}

export class ExchangeSaleDto {
  @ApiProperty({ description: 'UUID del detalle de venta devuelto' })
  @IsUUID()
  returned_detail_id!: string;

  @ApiProperty({ example: 10.0, description: 'Monto adicional cobrado al cliente' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  difference_amount!: number;

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  payment_method?: string | null;

  @ApiProperty({ type: ExchangeNewItemDto })
  @ValidateNested()
  @Type(() => ExchangeNewItemDto)
  new_item!: ExchangeNewItemDto;
}
