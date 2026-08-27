import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class CreateSizeDto {
  @ApiProperty({ example: 'S', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  description: string;

  @ApiPropertyOptional({ description: 'ID del tipo de talla (ej. Ropa, Calzado)' })
  @IsUUID()
  @IsOptional()
  sizeTypeId?: string;
}
