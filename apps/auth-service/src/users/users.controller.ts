import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAll(
    @Query() query: Record<string, string>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getAll(query, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.usersService.findByIdWithProfile(id);
  }

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, body, user);
  }

  @Patch(':id/password')
  resetPassword(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.resetPassword(id, body, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.softDelete(id, user);
  }
}
