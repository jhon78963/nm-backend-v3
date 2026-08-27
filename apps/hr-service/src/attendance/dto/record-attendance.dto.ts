import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID, IsDateString, IsEnum, IsOptional,
  IsInt, Min, IsString,
} from 'class-validator';

export enum AttendanceStatus {
  PUNTUAL              = 'PUNTUAL',
  TOLERANCIA           = 'TOLERANCIA',
  TARDE                = 'TARDE',
  FALTA                = 'FALTA',
  FALTA_INJUSTIFICADA  = 'FALTA_INJUSTIFICADA',
  DESCANSO             = 'DESCANSO',
  VACACIONES           = 'VACACIONES',
  RECUPERACION         = 'RECUPERACION',
  VALDEO               = 'VALDEO',
}

export class RecordAttendanceDto {
  @ApiProperty()
  @IsUUID()
  teamId: string;

  @ApiProperty({ example: '2026-08-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: '09:05', description: 'Hora de entrada (HH:mm)' })
  @IsString()
  @IsOptional()
  checkIn?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsString()
  @IsOptional()
  checkOut?: string;

  @ApiPropertyOptional({ description: 'Minutos de retraso', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayMinutes?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
