import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID, IsEnum, IsNumber, Min, IsDateString,
  IsOptional, IsString,
} from 'class-validator';

export enum PaymentType {
  PAYMENT   = 'PAYMENT',
  ADVANCE   = 'ADVANCE',
  DEDUCTION = 'DEDUCTION',
}

export enum PaymentMethod {
  CASH     = 'CASH',
  TRANSFER = 'TRANSFER',
  YAPE     = 'YAPE',
  CARD     = 'CARD',
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  teamId: string;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-08-25' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'q2', description: 'Quincena de nómina (q1 o q2)' })
  @IsString()
  @IsOptional()
  payrollPeriod?: string;

  @ApiProperty({ example: '2026-08', description: 'Mes contable YYYY-MM' })
  @IsString()
  accountingMonth: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Vincular a un CashMovement en el finance-service' })
  @IsUUID()
  @IsOptional()
  cashMovementId?: string;
}
