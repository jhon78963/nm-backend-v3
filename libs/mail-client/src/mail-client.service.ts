import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EcommerceMailTemplate, SendEcommerceMailPayload } from './types/ecommerce-mail.types';

export { EcommerceMailTemplate } from './types/ecommerce-mail.types';
export type { SendEcommerceMailPayload, EcommerceMailData } from './types/ecommerce-mail.types';

/**
 * Cliente HTTP para mail-service (solo uso interno service-to-service).
 */
@Injectable()
export class MailClientService {
  private readonly logger = new Logger(MailClientService.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('MAIL_SERVICE_URL', 'http://localhost:3013');
    this.serviceKey = config.get<string>('MAIL_SERVICE_KEY', '');
    this.enabled = config.get<string>('MAIL_SERVICE_ENABLED', 'true') !== 'false';
  }

  async sendEcommerceMail(payload: SendEcommerceMailPayload): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Mail disabled — skipped ${payload.template} → ${payload.to}`);
      return;
    }

    const url = `${this.baseUrl}/v1/mail/ecommerce/send`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-key': this.serviceKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`mail-service → ${response.status}: ${text}`);
      }
    } catch (err) {
      this.logger.warn(`mail-service unreachable: ${(err as Error).message}`);
    }
  }

  sendWelcome(to: string, data: SendEcommerceMailPayload<EcommerceMailTemplate.CUSTOMER_WELCOME>['data']) {
    return this.sendEcommerceMail({
      template: 'customer.welcome' as EcommerceMailTemplate,
      to,
      data,
    });
  }

  sendPasswordReset(
    to: string,
    data: SendEcommerceMailPayload<EcommerceMailTemplate.CUSTOMER_PASSWORD_RESET>['data'],
  ) {
    return this.sendEcommerceMail({
      template: 'customer.password-reset' as EcommerceMailTemplate,
      to,
      data,
    });
  }

  sendOrderConfirmation(
    to: string,
    data: SendEcommerceMailPayload<EcommerceMailTemplate.ORDER_CONFIRMATION>['data'],
  ) {
    return this.sendEcommerceMail({
      template: 'order.confirmation' as EcommerceMailTemplate,
      to,
      data,
    });
  }

  sendOrderStatusUpdate(
    to: string,
    data: SendEcommerceMailPayload<EcommerceMailTemplate.ORDER_STATUS_UPDATE>['data'],
  ) {
    return this.sendEcommerceMail({
      template: 'order.status-update' as EcommerceMailTemplate,
      to,
      data,
    });
  }
}
