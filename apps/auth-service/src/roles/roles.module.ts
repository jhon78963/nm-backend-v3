import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
