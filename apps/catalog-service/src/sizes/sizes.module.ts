import { Module } from '@nestjs/common';
import { SizesService } from './sizes.service';
import { SizesController } from './sizes.controller';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [SizesController],
  providers: [SizesService],
  exports: [SizesService],
})
export class SizesModule {}
