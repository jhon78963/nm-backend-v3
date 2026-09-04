import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignWelcomeCouponDto {
  @ApiProperty()
  @IsUUID('all')
  customerId!: string;
}
