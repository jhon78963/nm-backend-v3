import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/common/auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { CustomersModule } from './customers/customers.module';
import { VendorsModule } from './vendors/vendors.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    TeamsModule,
    CustomersModule,
    VendorsModule,
    AttendanceModule,
    PaymentsModule,
  ],
})
export class AppModule {}
