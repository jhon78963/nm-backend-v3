import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'BIENVENIDA10' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 120.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  warehouseId?: string;

  @ApiPropertyOptional({ example: '203.0.113.10' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  clientIp?: string;
}
