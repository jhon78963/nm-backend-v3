import { Module } from '@nestjs/common';

import { AuthModule } from '@app/common/auth/auth.module';
import { DatabaseModule } from '@app/database';

import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerJwtStrategy],
  exports: [CustomerAuthService, CustomerJwtStrategy],
})
export class CustomerAuthModule {}
