import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { StorageClientModule } from '@app/storage-client';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [DatabaseModule, StorageClientModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
