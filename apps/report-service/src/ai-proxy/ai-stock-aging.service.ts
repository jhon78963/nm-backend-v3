import { Injectable } from '@nestjs/common';

export interface StockAgingSignals {
  productAgeDays: number;
  daysSinceLastSale: number;
  salesLastMonth: number;
  currentStock: number;
  totalSalesAllTime: number;
}

export interface DeadStockAssessment {
  isDeadStock: boolean;
  deadStockTier: string;
  deadStockLabel: string;
}

@Injectable()
export class AiStockAgingService {
  evaluate(signals: StockAgingSignals): DeadStockAssessment {
    const idle = signals.daysSinceLastSale > 0
      ? signals.daysSinceLastSale
      : signals.productAgeDays;

    if (
      signals.productAgeDays >= 90
      && signals.totalSalesAllTime === 0
      && signals.currentStock >= 5
    ) {
      return this.result(true, 'critical', 'Sin ventas registradas: liquidación urgente recomendada.');
    }

    if (
      signals.productAgeDays >= 180
      && signals.salesLastMonth <= 4
      && signals.currentStock >= 10
      && idle >= 30
    ) {
      return this.result(true, 'critical', 'Atacasco crítico: antigüedad alta, stock elevado y ventas mínimas.');
    }

    if (
      signals.productAgeDays >= 120
      && signals.salesLastMonth < 5
      && signals.currentStock >= 5
      && idle >= 45
    ) {
      return this.result(true, 'high', 'Producto estancado: se recomienda rebaja fuerte para liberar capital.');
    }

    if (
      signals.productAgeDays >= 90
      && signals.totalSalesAllTime <= 10
      && signals.currentStock >= 10
      && idle >= 30
    ) {
      return this.result(true, 'aging', 'Rotación muy lenta: descuento adicional para acelerar salida.');
    }

    return this.result(false, 'none', '');
  }

  private result(isDeadStock: boolean, tier: string, label: string): DeadStockAssessment {
    return { isDeadStock, deadStockTier: tier, deadStockLabel: label };
  }
}
