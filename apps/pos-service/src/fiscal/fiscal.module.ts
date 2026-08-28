import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { FiscalConfigController } from './fiscal-config.controller';
import { FiscalConfigService } from './fiscal-config.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FiscalConfigController],
  providers: [FiscalConfigService],
  exports: [FiscalConfigService],
})
export class FiscalModule {}
