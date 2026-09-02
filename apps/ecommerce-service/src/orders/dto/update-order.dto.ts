import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ECOMMERCE_ORDER_STATUSES } from '../constants/order-statuses';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: ECOMMERCE_ORDER_STATUSES })
  @IsOptional()
  @IsIn([...ECOMMERCE_ORDER_STATUSES])
  status?: string;

  @ApiPropertyOptional({ enum: ['pending', 'paid'] })
  @IsOptional()
  @IsIn(['pending', 'paid'])
  paymentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderNotes?: string;
}
