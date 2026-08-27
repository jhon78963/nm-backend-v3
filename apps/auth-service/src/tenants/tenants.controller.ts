import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  getAll(
    @Query() query: Record<string, string>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.getAll(query, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.getOne(id, user);
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.getSettings(id, user);
  }

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.update(id, body, user);
  }

  @Put(':id/settings')
  saveSettings(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.saveSettings(id, body, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.delete(id, user);
  }
}
