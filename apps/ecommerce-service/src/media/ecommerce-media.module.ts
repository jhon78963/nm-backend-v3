import { Module } from '@nestjs/common';
import { StorageClientModule } from '@app/storage-client';

import { EcommerceMediaController } from './ecommerce-media.controller';
import { EcommerceMediaService } from './ecommerce-media.service';

@Module({
  imports: [StorageClientModule],
  controllers: [EcommerceMediaController],
  providers: [EcommerceMediaService],
  exports: [EcommerceMediaService],
})
export class EcommerceMediaModule {}
