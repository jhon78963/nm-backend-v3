import { Module, forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [UsersModule, forwardRef(() => AuthModule)],
  controllers: [ProfileController],
})
export class ProfileModule {}
