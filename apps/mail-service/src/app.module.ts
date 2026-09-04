import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthModule } from '@app/common/health/health.module';
import { QueueManagerModule } from '@app/queue-manager';

import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    QueueManagerModule.forRoot(),
    HealthModule,
    MailModule,
  ],
})
export class AppModule {}
