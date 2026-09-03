import { Module } from '@nestjs/common';

import { MailClientModule } from '@app/mail-client';

import { EcommerceMailNotificationsService } from './ecommerce-mail-notifications.service';

@Module({
  imports: [MailClientModule],
  providers: [EcommerceMailNotificationsService],
  exports: [EcommerceMailNotificationsService],
})
export class EcommerceMailModule {}
