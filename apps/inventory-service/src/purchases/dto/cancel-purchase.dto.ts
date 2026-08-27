import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CancelPurchaseDto {
  @ApiProperty({
    example: 'Error en precios de proveedor',
    description: 'Motivo de la cancelación (obligatorio para auditoría)',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
