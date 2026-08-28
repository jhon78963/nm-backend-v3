import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { TenantsService } from './tenants.service';
import { TenantLogoService } from './tenant-logo.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantLogoService: TenantLogoService,
  ) {}

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

  @Post(':id/logo')
  @ApiOperation({ summary: 'Subir o reemplazar logo del tenant' })
  @ApiConsumes('multipart/form-data')
  uploadLogo(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException('La petición debe ser multipart/form-data.');
    }
    return this.tenantLogoService.upload(req, id, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.delete(id, user);
  }
}
