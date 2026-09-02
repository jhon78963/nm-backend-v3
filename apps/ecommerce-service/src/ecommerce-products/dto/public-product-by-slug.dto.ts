import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PublicProductBySlugQueryDto {
  @ApiProperty({ description: 'UUID del almacén del tenant' })
  @IsUUID('all')
  warehouseId!: string;
}

export class PublicProductBySlugParamsDto {
  @ApiProperty({
    example: 'polera-dama-azul-d5d807f7',
    description: 'Slug SEO del producto',
  })
  @IsString()
  @IsNotEmpty()
  slug!: string;
}
