import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class SendNewsletterCampaignDto {
  @ApiProperty({ example: 'Novedades de esta semana' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject!: string;

  @ApiProperty({ example: 'Ofertas exclusivas para suscriptores' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Descubre las últimas novedades de nuestra tienda.' })
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  body!: string;

  @ApiPropertyOptional({ example: 'Resumen del boletín' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  previewText?: string;

  @ApiPropertyOptional({ example: 'https://tienda.ejemplo.com/ofertas' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  ctaUrl?: string;

  @ApiPropertyOptional({ example: 'Ver ofertas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ctaLabel?: string;
}
