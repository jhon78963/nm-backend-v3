import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotIn,
} from 'class-validator';

/**
 * Reglas de contraseña equivalentes a SEC-011/SEC-013 en PasswordSecurityTest de Pest:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula, una minúscula, un número y un carácter especial
 * - No puede ser igual a la contraseña actual (validado en el servicio)
 */
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  current_password: string;

  @ApiProperty({
    minLength: 8,
    description: 'Mín. 8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 especial',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message:
      'La contraseña debe contener mayúscula, minúscula, número y carácter especial.',
  })
  new_password: string;
}
