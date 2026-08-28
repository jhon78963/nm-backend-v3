import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '@app/storage';
import { FilesModule } from './files/files.module';
import { UploadModule } from './upload/upload.module';
import { StorageServiceKeyGuard } from './guards/storage-service-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    UploadModule,
    FilesModule,
  ],
  providers: [StorageServiceKeyGuard],
})
export class AppModule {}
