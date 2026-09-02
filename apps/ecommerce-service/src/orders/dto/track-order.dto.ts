import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class TrackOrderQueryDto {
  @ApiProperty({ example: 'NM-20260902-0001' })
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @ApiProperty({ description: 'Correo o teléfono del pedido' })
  @IsString()
  @IsNotEmpty()
  contact!: string;
}

export class PublicOrderQueryDto {
  @ApiProperty({ description: 'Correo del pedido (verificación)' })
  @IsEmail()
  email!: string;
}
