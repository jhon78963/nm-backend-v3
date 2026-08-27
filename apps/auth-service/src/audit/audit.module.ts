import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
