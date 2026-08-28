import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantLogoService } from './tenant-logo.service';
import { StorageClientModule } from '@app/storage-client';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule), StorageClientModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantLogoService],
})
export class TenantsModule {}
