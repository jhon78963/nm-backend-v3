import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class RenderPdfDto {
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @IsObject()
  data!: Record<string, unknown>;
}
