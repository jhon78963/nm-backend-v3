import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '@app/storage';
import { FilesModule } from './files/files.module';
import { UploadModule } from './upload/upload.module';
import { StorageServiceKeyGuard } from './guards/storage-service-key.guard';
import { HealthModule } from '@app/common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    HealthModule,
    UploadModule,
    FilesModule,
  ],
  providers: [StorageServiceKeyGuard],
})
export class AppModule {}
