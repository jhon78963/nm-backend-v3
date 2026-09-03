import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const ADMIN_REFUND_STATUSES = ['pending', 'approved', 'rejected', 'completed'] as const;

export class UpdateAdminRefundDto {
  @ApiPropertyOptional({ enum: ADMIN_REFUND_STATUSES })
  @IsOptional()
  @IsIn([...ADMIN_REFUND_STATUSES])
  status?: (typeof ADMIN_REFUND_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
}
