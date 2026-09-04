import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MailServiceKeyGuard } from '../guards/mail-service-key.guard';
import { MailDeliveryService } from './mail-delivery.service';
import { MailController } from './mail.controller';
import { MAIL_QUEUE } from './mail-queue.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  controllers: [MailController],
  providers: [MailService, MailDeliveryService, MailProcessor, MailServiceKeyGuard],
  exports: [MailService],
})
export class MailModule {}
