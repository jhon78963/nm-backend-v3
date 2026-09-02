import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import type { SocialMediaPlatform } from '../constants/social-media.defaults';

export class SocialMediaBannerDto {
  @ApiPropertyOptional({ example: 'tiktok-1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  id?: string;

  @ApiPropertyOptional({ example: '/images/theme/marketplace_one/marketplace_one_insta_1.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.tiktok.com/' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  href?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateSocialMediaDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ example: '# TIKTOK' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ enum: ['tiktok', 'instagram'], default: 'tiktok' })
  @IsOptional()
  @IsIn(['tiktok', 'instagram'])
  platform?: SocialMediaPlatform;

  @ApiPropertyOptional({ example: 'https://www.tiktok.com/' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileUrl?: string;

  @ApiPropertyOptional({ type: [SocialMediaBannerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaBannerDto)
  banners?: SocialMediaBannerDto[];
}
