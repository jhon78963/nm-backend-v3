import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class PublicProductsQueryDto {
  @ApiPropertyOptional({
    example: 'uuid-1,uuid-2,uuid-3',
    description: 'IDs de producto separados por coma',
  })
  @ValidateIf((query: PublicProductsQueryDto) => !query.slug)
  @IsString()
  @IsNotEmpty()
  ids?: string;

  @ApiPropertyOptional({
    example: 'bermuda-importada-cargo-i-run-d5d807f7',
    description: 'Slug SEO del producto',
  })
  @ValidateIf((query: PublicProductsQueryDto) => !query.ids)
  @IsString()
  @IsNotEmpty()
  slug?: string;

  @ApiProperty({ description: 'UUID del almacén del tenant' })
  @IsUUID('all')
  warehouseId!: string;
}
