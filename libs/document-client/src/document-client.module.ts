import { Module } from '@nestjs/common';
import { DocumentClientService } from './document-client.service';

@Module({
  providers: [DocumentClientService],
  exports: [DocumentClientService],
})
export class DocumentClientModule {}
