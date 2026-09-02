import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PublicProductsQueryDto {
  @ApiProperty({
    example: 'uuid-1,uuid-2,uuid-3',
    description: 'IDs de producto separados por coma',
  })
  @IsString()
  @IsNotEmpty()
  ids!: string;

  @ApiProperty({ description: 'UUID del almacén del tenant' })
  @IsUUID('all')
  warehouseId!: string;
}
