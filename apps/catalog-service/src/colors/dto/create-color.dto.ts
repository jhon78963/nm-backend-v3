import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateColorDto {
  @ApiProperty({ example: 'Rojo Carmesí' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  description: string;

  @ApiPropertyOptional({ example: '#DC143C', description: 'Código HEX de color' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'hash debe ser un código HEX válido (ej: #DC143C).' })
  hash?: string;
}
