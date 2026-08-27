import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { UserActionLogWriter } from './user-action-log.writer';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [UserActionLogWriter],
  exports: [UserActionLogWriter],
})
export class AuditLogModule {}
