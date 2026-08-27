import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertVendorDto {
  @ApiProperty({ example: 'Distribuidora Norte S.A.C.', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Av. Industrial 123, Lima', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Galería Central', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  local?: string;

  @ApiPropertyOptional({ example: '999888777', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Distribuidora Norte S.A.C.', maxLength: 255 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Av. Industrial 123, Lima', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Galería Central', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  local?: string;

  @ApiPropertyOptional({ example: '999888777', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
