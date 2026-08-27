import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { PurchaseLineDto } from './register-bulk-purchase.dto';

export class AppendPurchaseLinesDto {
  @ApiProperty({ type: [PurchaseLineDto], minItems: 1 })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines: PurchaseLineDto[];
}
