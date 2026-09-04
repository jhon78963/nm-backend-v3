import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { SendEcommerceMailDto } from './dto/send-ecommerce-mail.dto';
import { MailDeliveryService } from './mail-delivery.service';
import { MAIL_QUEUE, MAIL_SEND_JOB } from './mail-queue.constants';

@Processor(MAIL_QUEUE, {
  concurrency: Number(process.env.MAIL_QUEUE_CONCURRENCY ?? 5),
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly deliveryService: MailDeliveryService) {
    super();
  }

  async process(job: Job<SendEcommerceMailDto>): Promise<unknown> {
    if (job.name !== MAIL_SEND_JOB) {
      this.logger.warn(`Trabajo desconocido en cola mail: ${job.name}`);
      return;
    }

    this.logger.debug(`Procesando correo ${job.id}: ${job.data.template} → ${job.data.to}`);
    return this.deliveryService.deliverEcommerceMail(job.data);
  }
}
