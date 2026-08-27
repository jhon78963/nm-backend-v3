import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * SEC-013: No revela si el email existe (la respuesta es siempre 200).
 */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @IsNotEmpty()
  email: string;
}
