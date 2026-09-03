import { Module } from '@nestjs/common';

import { MailClientService } from './mail-client.service';

@Module({
  providers: [MailClientService],
  exports: [MailClientService],
})
export class MailClientModule {}
