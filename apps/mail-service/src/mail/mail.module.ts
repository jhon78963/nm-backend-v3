import { Module } from '@nestjs/common';

import { MailServiceKeyGuard } from '../guards/mail-service-key.guard';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  controllers: [MailController],
  providers: [MailService, MailServiceKeyGuard],
  exports: [MailService],
})
export class MailModule {}
