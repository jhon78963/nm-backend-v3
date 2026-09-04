import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EcommerceMailTemplate, MailClientService } from '@app/mail-client';

@Injectable()
export class NewsletterMailService {
  private readonly logger = new Logger(NewsletterMailService.name);

  constructor(
    private readonly mailClient: MailClientService,
    private readonly config: ConfigService,
  ) {}

  private get storeUrl(): string {
    return this.config.get<string>(
      'ECOMMERCE_STORE_URL',
      this.config.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    );
  }

  sendSubscriptionConfirmation(to: string): void {
    void this.mailClient
      .sendEcommerceMail({
        template: EcommerceMailTemplate.NEWSLETTER_SUBSCRIBED,
        to,
        data: { storeUrl: this.storeUrl },
      })
      .catch((error) => {
        this.logger.warn(
          `No se pudo enviar confirmación de boletín a ${to}: ${(error as Error).message}`,
        );
      });
  }

  async sendCampaignEmail(
    to: string,
    payload: {
      subject: string;
      title: string;
      body: string;
      previewText?: string;
      ctaUrl?: string;
      ctaLabel?: string;
    },
  ): Promise<boolean> {
    try {
      await this.mailClient.sendEcommerceMail({
        template: EcommerceMailTemplate.NEWSLETTER_CAMPAIGN,
        to,
        subject: payload.subject,
        data: {
          title: payload.title,
          body: payload.body,
          previewText: payload.previewText,
          ctaUrl: payload.ctaUrl,
          ctaLabel: payload.ctaLabel,
          storeUrl: this.storeUrl,
        },
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar campaña de boletín a ${to}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
