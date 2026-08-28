import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { VoucherService } from './voucher.service';

@ApiTags('Cashflow Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'cashflow/:movementId/vouchers', version: '1' })
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  @ApiOperation({ summary: 'Adjuntar comprobante(s) a un movimiento de caja' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'movementId', description: 'UUID del movimiento de caja' })
  upload(
    @Param('movementId') movementId: string,
    @Req() req: FastifyRequest,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException('La petición debe ser multipart/form-data.');
    }
    return this.voucherService.upload(req, movementId);
  }

  @Delete(':voucherId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un comprobante de un movimiento' })
  @ApiParam({ name: 'movementId', description: 'UUID del movimiento de caja' })
  @ApiParam({ name: 'voucherId', description: 'UUID del voucher' })
  remove(
    @Param('movementId') movementId: string,
    @Param('voucherId') voucherId: string,
  ) {
    return this.voucherService.remove(movementId, voucherId);
  }
}
