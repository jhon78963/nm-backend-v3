import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionsResolverService } from './permissions-resolver.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PermissionsResolverService, PermissionsGuard],
  exports: [PermissionsResolverService, PermissionsGuard],
})
export class PermissionsModule {}
