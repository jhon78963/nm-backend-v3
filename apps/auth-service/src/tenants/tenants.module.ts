import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
