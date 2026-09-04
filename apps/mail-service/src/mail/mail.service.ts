import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { EcommerceMailTemplate } from '@app/mail-client';
import { isQueueEnabled, resolveDefaultJobOptions } from '@app/queue-manager';

import { SendEcommerceMailDto } from './dto/send-ecommerce-mail.dto';
import { MailDeliveryService } from './mail-delivery.service';
import { MAIL_QUEUE, MAIL_SEND_JOB } from './mail-queue.constants';

const MAIL_QUEUE_PREFIX = 'MAIL';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<SendEcommerceMailDto>,
    private readonly deliveryService: MailDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async sendEcommerceMail(dto: SendEcommerceMailDto) {
    const to = dto.to.trim().toLowerCase();
    if (!to) {
      throw new BadRequestException('Destinatario inválido.');
    }

    const payload: SendEcommerceMailDto = { ...dto, to };

    if (!isQueueEnabled(this.config, MAIL_QUEUE_PREFIX)) {
      const result = await this.deliveryService.deliverEcommerceMail(payload);
      return { ...result, queued: false };
    }

    try {
      const job = await this.mailQueue.add(
        MAIL_SEND_JOB,
        payload,
        resolveDefaultJobOptions(this.config, MAIL_QUEUE_PREFIX),
      );

      this.logger.log(`Correo encolado: ${dto.template} → ${to} (job ${job.id})`);
      return {
        success: true,
        queued: true,
        jobId: job.id,
        template: dto.template,
        to,
      };
    } catch (error) {
      this.logger.warn(
        `Cola mail no disponible — envío síncrono: ${(error as Error).message}`,
      );
      const result = await this.deliveryService.deliverEcommerceMail(payload);
      return { ...result, queued: false, fallback: true };
    }
  }

  listTemplates() {
    return Object.values(EcommerceMailTemplate);
  }
}
