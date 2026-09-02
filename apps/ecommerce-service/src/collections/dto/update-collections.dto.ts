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

export class HomeCollectionItemDto {
  @ApiProperty({ example: 'todays-deal' })
  @IsString()
  @MaxLength(80)
  id!: string;

  @ApiPropertyOptional({ example: 'special offer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @ApiProperty({ example: "today's deal" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}

export class UpdateCollectionsDto {
  @ApiProperty({ type: [HomeCollectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeCollectionItemDto)
  collections!: HomeCollectionItemDto[];
}
