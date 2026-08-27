import { Module } from '@nestjs/common';
import { ColorsService } from './colors.service';
import { ColorsController } from './colors.controller';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [ColorsController],
  providers: [ColorsService],
  exports: [ColorsService],
})
export class ColorsModule {}
