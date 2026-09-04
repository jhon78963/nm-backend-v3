import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { SendEcommerceMailDto } from './dto/send-ecommerce-mail.dto';
import { resolveMailBranding } from './templates/branding';
import { buildMailContent } from './templates/ecommerce-templates';

@Injectable()
export class MailDeliveryService {
  private readonly logger = new Logger(MailDeliveryService.name);
  private transporter: Transporter | null = null;
  private readonly branding: ReturnType<typeof resolveMailBranding>;
  private readonly fromAddress: string;
  private readonly dryRun: boolean;

  constructor(private readonly config: ConfigService) {
    this.branding = resolveMailBranding(config);
    const zohoUser = config.get<string>('ZOHO_USER', '');
    const fromEmail = config.get<string>('MAIL_FROM_EMAIL', zohoUser);
    this.fromAddress = fromEmail ? `"${this.branding.storeName}" <${fromEmail}>` : this.branding.storeName;
    this.dryRun = !zohoUser || !config.get<string>('ZOHO_APP_PASSWORD');

    if (this.dryRun) {
      this.logger.warn('Zoho Mail no configurado — los correos se registrarán en consola (dry-run).');
    } else {
      const port = Number(config.get<string>('ZOHO_SMTP_PORT', '465'));
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('ZOHO_SMTP_HOST', 'smtp.zoho.com'),
        port,
        secure: port === 465,
        auth: {
          user: zohoUser,
          pass: config.getOrThrow<string>('ZOHO_APP_PASSWORD'),
        },
      });
    }
  }

  async deliverEcommerceMail(dto: SendEcommerceMailDto) {
    const to = dto.to.trim().toLowerCase();
    if (!to) {
      throw new BadRequestException('Destinatario inválido.');
    }

    const { subject, html, text } = buildMailContent(dto.template, dto.data, this.branding);
    const finalSubject = dto.subject?.trim() || subject;

    if (this.dryRun || !this.transporter) {
      this.logger.log(`[DRY-RUN] ${dto.template} → ${to} | ${finalSubject}`);
      return { success: true, dryRun: true, template: dto.template, to };
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: finalSubject,
      html,
      text,
    });

    this.logger.log(`Correo enviado: ${dto.template} → ${to}`);
    return { success: true, dryRun: false, template: dto.template, to };
  }
}
