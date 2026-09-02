import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OptionalUuidProperty } from '../../common/optional-uuid.transform';

export class UpdateBannerItemDto {
  @ApiPropertyOptional({ description: 'ID existente para actualizar el banner' })
  @OptionalUuidProperty()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: '/images/banners/banner-1.png' })
  @IsString()
  @MaxLength(500)
  imageUrl!: string;

  @ApiProperty({ example: '/tienda' })
  @IsString()
  @MaxLength(500)
  href!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBannersDto {
  @ApiProperty({ type: [UpdateBannerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBannerItemDto)
  banners!: UpdateBannerItemDto[];
}
