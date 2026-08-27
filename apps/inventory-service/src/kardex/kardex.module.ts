import { Module } from '@nestjs/common';
import { KardexController } from './kardex.controller';
import { KardexService } from './kardex.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [KardexController],
  providers: [KardexService],
  exports: [KardexService],
})
export class KardexModule {}
