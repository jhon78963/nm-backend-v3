import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRefundRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
