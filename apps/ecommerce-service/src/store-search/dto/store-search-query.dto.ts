import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class StoreSearchQueryDto {
  @ApiPropertyOptional({ description: 'Texto de búsqueda' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ description: 'UUID del almacén del tenant' })
  @IsUUID('all')
  warehouseId!: string;

  @ApiPropertyOptional({ default: 4, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  perPage?: number;
}
