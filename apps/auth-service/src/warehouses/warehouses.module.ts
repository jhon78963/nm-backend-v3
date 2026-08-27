import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [WarehousesController],
  providers: [WarehousesService],
})
export class WarehousesModule {}
