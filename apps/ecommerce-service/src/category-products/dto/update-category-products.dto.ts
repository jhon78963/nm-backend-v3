import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeCategoryProductTabDto {
  @ApiProperty({ example: '29' })
  @IsString()
  @MaxLength(80)
  id!: string;

  @ApiProperty({ example: 'Muebles' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'muebles' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}

export class HomeCategoryProductLeftPanelDto {
  @ApiProperty({ example: 'Menos de S/ 20' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}

export class HomeCategoryProductBannerDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  href?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;
}

export class HomeCategoryProductCategoryDto {
  @ApiProperty({ example: 'RECOMENDACIONES PARA TI' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ type: [HomeCategoryProductTabDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeCategoryProductTabDto)
  tabs?: HomeCategoryProductTabDto[];
}

export class HomeCategoryProductRightPanelDto {
  @ApiProperty({ type: HomeCategoryProductCategoryDto })
  @ValidateNested()
  @Type(() => HomeCategoryProductCategoryDto)
  productCategory!: HomeCategoryProductCategoryDto;

  @ApiPropertyOptional({ type: HomeCategoryProductBannerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCategoryProductBannerDto)
  productBanner?: HomeCategoryProductBannerDto;
}

export class UpdateCategoryProductsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ type: HomeCategoryProductLeftPanelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCategoryProductLeftPanelDto)
  leftPanel?: HomeCategoryProductLeftPanelDto;

  @ApiProperty({ type: HomeCategoryProductRightPanelDto })
  @ValidateNested()
  @Type(() => HomeCategoryProductRightPanelDto)
  rightPanel!: HomeCategoryProductRightPanelDto;
}
