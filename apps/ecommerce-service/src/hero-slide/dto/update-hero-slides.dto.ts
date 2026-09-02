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

export class UpdateHeroSlideItemDto {
  @ApiPropertyOptional({ description: 'ID existente para actualizar el slide' })
  @OptionalUuidProperty()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: '/images/home/home-hero-1.png' })
  @IsString()
  @MaxLength(500)
  imageUrl!: string;

  @ApiProperty({ example: '/tienda' })
  @IsString()
  @MaxLength(500)
  href!: string;

  @ApiPropertyOptional({ example: 'Banner principal' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHeroSlidesDto {
  @ApiProperty({ type: [UpdateHeroSlideItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateHeroSlideItemDto)
  slides!: UpdateHeroSlideItemDto[];
}
