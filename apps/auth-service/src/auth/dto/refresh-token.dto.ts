import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT refresh token' })
  @IsNotEmpty()
  @IsJWT({ message: 'refresh_token debe ser un JWT válido.' })
  refresh_token: string;
}
