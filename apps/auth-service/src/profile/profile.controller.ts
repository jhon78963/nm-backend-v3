import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { UsersService } from '../users/users.service';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  show(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdWithProfile(user.id);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.updateProfile(user.id, body);
  }
}
