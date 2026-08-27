import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpsertCustomerDto {
  @ApiProperty({ example: '74935446' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos.' })
  dni: string;

  @ApiProperty({ example: 'Anali Saraeli' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'Trujillo Cardenas' })
  @IsString()
  @Length(1, 100)
  surname: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: '74935446' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos.' })
  dni?: string;

  @ApiPropertyOptional({ example: 'Anali Saraeli' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'Trujillo Cardenas' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  surname?: string;
}
