import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class AddSizeColorDto {
  @ApiProperty()
  @IsUUID()
  colorId: string;

  @ApiPropertyOptional({ description: 'Stock inicial para este color/talla', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  initialStock?: number = 0;
}

export class UpdateSizeColorDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  colorId?: string;
}
