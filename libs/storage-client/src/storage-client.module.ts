import { Module } from '@nestjs/common';
import { StorageClientService } from './storage-client.service';

@Module({
  providers: [StorageClientService],
  exports: [StorageClientService],
})
export class StorageClientModule {}
