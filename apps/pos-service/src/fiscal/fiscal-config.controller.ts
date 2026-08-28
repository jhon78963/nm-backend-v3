import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { WarehouseGuard } from '@app/common/guards/warehouse.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { FiscalConfigService } from './fiscal-config.service';

@ApiTags('POS — Fiscal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WarehouseGuard)
@Controller({ path: 'pos', version: '1' })
export class FiscalConfigController {
  constructor(private readonly fiscalConfigService: FiscalConfigService) {}

  @Get('fiscal-config')
  @ApiOperation({ summary: 'Configuración de facturación electrónica para el POS' })
  getFiscalConfig(@CurrentUser() user: AuthenticatedUser) {
    const warehouseId = user.warehouseId;
    if (!warehouseId) {
      return this.fiscalConfigService.getForWarehouse('');
    }

    return this.fiscalConfigService.getForWarehouse(warehouseId);
  }
}
