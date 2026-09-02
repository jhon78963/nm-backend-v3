import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ShopCollectionItemDto {
  @ApiProperty({ example: 'ninos' })
  @IsString()
  @MaxLength(80)
  id!: string;

  @ApiProperty({ example: 'ninos' })
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, {
    message: 'slug debe ser kebab-case (ej. adulto-mayor)',
  })
  slug!: string;

  @ApiProperty({ example: 'Niños' })
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '/api/v1/storage/files/products/banner.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}

export class UpdateShopCollectionsDto {
  @ApiProperty({ type: [ShopCollectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShopCollectionItemDto)
  collections!: ShopCollectionItemDto[];
}
