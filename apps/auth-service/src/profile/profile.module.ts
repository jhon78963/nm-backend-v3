import { Module, forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { AvatarController } from './avatar/avatar.controller';
import { AvatarService } from './avatar/avatar.service';
import { StorageClientModule } from '@app/storage-client';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [UsersModule, forwardRef(() => AuthModule), StorageClientModule, DatabaseModule],
  controllers: [ProfileController, AvatarController],
  providers: [AvatarService],
})
export class ProfileModule {}
