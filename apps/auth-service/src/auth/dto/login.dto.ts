import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Equivale al LoginRequest de Laravel + la lógica de AuthController@login.
 * El campo `username` acepta tanto email como nombre de usuario (igual que
 * el AuthService original que busca por email o username).
 */
export class LoginDto {
  @ApiProperty({
    example: 'jperez',
    description: 'Nombre de usuario o correo electrónico',
  })
  @IsString()
  @IsNotEmpty({ message: 'El usuario es requerido.' })
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'MyS3cret!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;
}
