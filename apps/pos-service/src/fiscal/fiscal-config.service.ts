import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';

export interface FiscalConfig {
  tenantElectronicInvoicingEnabled: boolean;
  warehouseElectronicInvoicingEnabled: boolean;
  electronicInvoicingEnabled: boolean;
  series: {
    boleta: string | null;
    factura: string | null;
  };
}

@Injectable()
export class FiscalConfigService {
  constructor(private readonly db: DatabaseService) {}

  async getForWarehouse(warehouseId: string): Promise<FiscalConfig> {
    const warehouse = await this.db.warehouse.findFirst({
      where: { id: warehouseId, isDeleted: false },
      include: {
        tenant: { include: { setting: true } },
        documentSeries: true,
      },
    });

    if (!warehouse) {
      return this.emptyConfig();
    }

    const tenantEnabled = warehouse.tenant.setting?.electronicInvoicingEnabled ?? false;
    const warehouseEnabled = warehouse.electronicInvoicingEnabled;
    const boletaSeries = warehouse.documentSeries.find((s) => s.documentType === 'BOLETA');
    const facturaSeries = warehouse.documentSeries.find((s) => s.documentType === 'FACTURA');

    return {
      tenantElectronicInvoicingEnabled: tenantEnabled,
      warehouseElectronicInvoicingEnabled: warehouseEnabled,
      electronicInvoicingEnabled: tenantEnabled && warehouseEnabled,
      series: {
        boleta: boletaSeries?.serie ?? null,
        factura: facturaSeries?.serie ?? null,
      },
    };
  }

  async assertFiscalDocumentsAllowed(warehouseId: string, documentType?: string): Promise<void> {
    if (!documentType || documentType === 'TICKET') {
      return;
    }

    const config = await this.getForWarehouse(warehouseId);
    if (!config.electronicInvoicingEnabled) {
      throw new Error('ELECTRONIC_INVOICING_DISABLED');
    }
  }

  private emptyConfig(): FiscalConfig {
    return {
      tenantElectronicInvoicingEnabled: false,
      warehouseElectronicInvoicingEnabled: false,
      electronicInvoicingEnabled: false,
      series: { boleta: null, factura: null },
    };
  }
}
