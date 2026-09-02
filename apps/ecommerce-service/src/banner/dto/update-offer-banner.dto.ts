import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOfferBannerDto {
  @ApiProperty({ example: '/images/theme/marketplace_one/marketplace_one_6.png' })
  @IsString()
  @MaxLength(500)
  imageUrl!: string;

  @ApiProperty({ example: '/tienda' })
  @IsString()
  @MaxLength(500)
  href!: string;

  @ApiPropertyOptional({ example: 'Banner promocional del home' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
