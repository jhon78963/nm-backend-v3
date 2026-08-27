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
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'warehouses', version: '1' })
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  getAll(
    @Query() query: Record<string, string>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.getAll(query, user);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.warehousesService.getOne(id);
  }

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.create(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.warehousesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.warehousesService.delete(id);
  }
}
