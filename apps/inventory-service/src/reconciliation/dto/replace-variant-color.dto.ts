import { IsUUID } from 'class-validator';

export class ReplaceVariantColorDto {
  @IsUUID()
  fromColorId: string;

  @IsUUID()
  toColorId: string;
}
