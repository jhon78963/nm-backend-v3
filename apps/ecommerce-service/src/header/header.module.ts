import { Module } from '@nestjs/common';

import { HeaderCacheService } from './header-cache.service';
import { HeaderController } from './header.controller';
import { HeaderService } from './header.service';

@Module({
  controllers: [HeaderController],
  providers: [HeaderService, HeaderCacheService],
  exports: [HeaderService],
})
export class HeaderModule {}
