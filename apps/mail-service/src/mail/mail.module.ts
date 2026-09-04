import { Module } from '@nestjs/common';

import { QueueManagerModule } from '@app/queue-manager';

import { MailServiceKeyGuard } from '../guards/mail-service-key.guard';
import { MailDeliveryService } from './mail-delivery.service';
import { MailController } from './mail.controller';
import { MAIL_QUEUE } from './mail-queue.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    QueueManagerModule.registerQueues({
      name: MAIL_QUEUE,
      configPrefix: 'MAIL',
    }),
  ],
  controllers: [MailController],
  providers: [MailService, MailDeliveryService, MailProcessor, MailServiceKeyGuard],
  exports: [MailService],
})
export class MailModule {}
