import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { DocumentLookupService } from './document-lookup.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomersController],
  providers: [CustomersService, DocumentLookupService],
  exports: [CustomersService],
})
export class CustomersModule {}
