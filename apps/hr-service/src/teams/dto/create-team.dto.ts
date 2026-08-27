import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsUUID, IsOptional,
  IsNumber, Min, MaxLength, Length,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: '12345678', description: 'DNI del trabajador' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 12)
  dni: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Pérez García' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  surname: string;

  @ApiProperty({ description: 'Salario mensual en soles', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salary: number;

  @ApiProperty({ description: 'ID del almacén al que pertenece' })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'ID del usuario vinculado (si tiene acceso al sistema)' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
