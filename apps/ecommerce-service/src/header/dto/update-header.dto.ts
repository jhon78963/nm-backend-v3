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

export class UpdateNavigationItemDto {
  @ApiPropertyOptional({ description: 'ID existente para actualizar el ítem' })
  @OptionalUuidProperty()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Tienda' })
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiProperty({ example: '/tienda' })
  @IsString()
  @MaxLength(500)
  href!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID del ítem padre para submenús' })
  @OptionalUuidProperty()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class UpdateHeaderDto {
  @ApiPropertyOptional({ example: 'Bienvenido a Novedades Maritex' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  topbarMessage?: string | null;

  @ApiPropertyOptional({ example: '+51 999 999 999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  supportPhone?: string | null;

  @ApiProperty({ example: 'Novedades Maritex' })
  @IsString()
  @MaxLength(255)
  logoText!: string;

  @ApiPropertyOptional({ example: '/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  topBarEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  stickyEnabled?: boolean;

  @ApiPropertyOptional({ type: [UpdateNavigationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateNavigationItemDto)
  navigationItems?: UpdateNavigationItemDto[];
}
