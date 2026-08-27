import { Module } from '@nestjs/common';
import { GendersService } from './genders.service';
import { GendersController } from './genders.controller';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [GendersController],
  providers: [GendersService],
  exports: [GendersService],
})
export class GendersModule {}
