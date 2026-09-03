import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { EcommerceMailTemplate } from '@app/mail-client';

import { SendEcommerceMailDto } from './dto/send-ecommerce-mail.dto';
import { buildMailContent } from './templates/ecommerce-templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly storeName: string;
  private readonly storeUrl: string;
  private readonly fromAddress: string;
  private readonly dryRun: boolean;

  constructor(private readonly config: ConfigService) {
    this.storeName = config.get<string>('MAIL_FROM_NAME', 'Novedades Maritex');
    this.storeUrl = config.get<string>(
      'ECOMMERCE_STORE_URL',
      config.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    );
    const gmailUser = config.get<string>('GMAIL_USER', '');
    const fromEmail = config.get<string>('MAIL_FROM_EMAIL', gmailUser);
    this.fromAddress = fromEmail ? `"${this.storeName}" <${fromEmail}>` : this.storeName;
    this.dryRun = !gmailUser || !config.get<string>('GMAIL_APP_PASSWORD');

    if (this.dryRun) {
      this.logger.warn('Gmail no configurado — los correos se registrarán en consola (dry-run).');
    } else {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: config.getOrThrow<string>('GMAIL_APP_PASSWORD'),
        },
      });
    }
  }

  async sendEcommerceMail(dto: SendEcommerceMailDto) {
    const to = dto.to.trim().toLowerCase();
    if (!to) {
      throw new BadRequestException('Destinatario inválido.');
    }

    const { subject, html, text } = buildMailContent(dto.template, dto.data, {
      storeName: this.storeName,
      storeUrl: this.storeUrl,
    });

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

  listTemplates() {
    return Object.values(EcommerceMailTemplate);
  }
}
