import { Module } from '@nestjs/common';

import {
  AdminCustomersController,
  AdminRefundsController,
} from './admin-customers.controller';
import { AdminCustomersService } from './admin-customers.service';

@Module({
  controllers: [AdminCustomersController, AdminRefundsController],
  providers: [AdminCustomersService],
})
export class AdminCustomersModule {}
