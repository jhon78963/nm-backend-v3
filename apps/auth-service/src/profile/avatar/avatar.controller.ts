import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { AvatarService } from './avatar.service';

@ApiTags('Profile — Avatar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile/avatar', version: '1' })
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post()
  @ApiOperation({ summary: 'Subir o reemplazar foto de perfil' })
  @ApiConsumes('multipart/form-data')
  async upload(
    @Req() req: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException('La petición debe ser multipart/form-data.');
    }
    return this.avatarService.upload(req, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar foto de perfil' })
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.avatarService.remove(user.id);
  }
}
