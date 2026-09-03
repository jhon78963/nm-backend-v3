import { IsEmail, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { EcommerceMailTemplate } from '@app/mail-client';

export class SendEcommerceMailDto {
  @IsEnum(EcommerceMailTemplate)
  template!: EcommerceMailTemplate;

  @IsEmail()
  to!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsObject()
  data!: Record<string, unknown>;
}
