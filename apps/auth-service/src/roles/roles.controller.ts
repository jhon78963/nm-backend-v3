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
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  getPermissions() {
    return this.rolesService.getPermissions();
  }

  @Get()
  getAll(
    @Query() query: Record<string, string>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.getAll(query, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.rolesService.getOne(id);
  }

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.create(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':id/sync-permissions')
  syncPermissions(
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    return this.rolesService.syncPermissions(id, body.permissions ?? []);
  }
}
