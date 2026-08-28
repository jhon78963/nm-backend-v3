import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import { FirebaseStorageProvider } from './providers/firebase-storage.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';

/**
 * StorageModule — Selecciona el provider según STORAGE_DRIVER.
 *
 * STORAGE_DRIVER=local    → LocalStorageProvider  (disco)
 * STORAGE_DRIVER=firebase → FirebaseStorageProvider (bucket GCS)
 *
 * Importar en cualquier app del monorepo para acceder al STORAGE_PROVIDER token.
 */
@Global()
@Module({
  providers: [
    LocalStorageProvider,
    FirebaseStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalStorageProvider, FirebaseStorageProvider],
      useFactory: (
        config: ConfigService,
        local: LocalStorageProvider,
        firebase: FirebaseStorageProvider,
      ) => {
        const driver = config.get<string>('STORAGE_DRIVER', 'local');
        return driver === 'firebase' ? firebase : local;
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
