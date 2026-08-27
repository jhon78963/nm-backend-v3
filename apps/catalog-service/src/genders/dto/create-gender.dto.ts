import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateGenderDto {
  @ApiProperty({ example: 'Mujer', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'F', maxLength: 10 })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  shortName?: string;
}
