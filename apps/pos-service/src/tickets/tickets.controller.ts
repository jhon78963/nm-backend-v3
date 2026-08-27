import { Controller, Get, Param, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { SalesService } from '../sales/sales.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private readonly salesService: SalesService) {}

  @Get(':id')
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Generar ticket HTML para impresión térmica' })
  @ApiParam({ name: 'id', description: 'UUID de la venta' })
  async getTicketHtml(@Param('id') id: string): Promise<string> {
    const sale = await this.salesService.findById(id);

    const formatDate = (d: Date | string) => {
      const dt = new Date(d);
      return `${dt.toLocaleDateString('es-PE')} ${dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const formatMoney = (n: number | { toNumber?: () => number }) => {
      const val = typeof n === 'object' && n.toNumber ? n.toNumber() : Number(n);
      return `S/ ${val.toFixed(2)}`;
    };

    const docLabel = (sale as any).documentType === 'BOLETA'
      ? 'BOLETA DE VENTA'
      : (sale as any).documentType === 'FACTURA'
        ? 'FACTURA'
        : 'COMPROBANTE DE VENTA';

    const details = ((sale as any).details ?? []) as any[];
    const payments = ((sale as any).payments ?? []) as any[];
    const customer = (sale as any).customer;

    const itemsHtml = details.map((d: any) => `
      <tr>
        <td style="padding:2px 0">${d.productName ?? 'Producto'}</td>
        <td style="text-align:right;padding:2px 4px">${d.quantity}</td>
        <td style="text-align:right">${formatMoney(d.unitPrice)}</td>
        <td style="text-align:right">${formatMoney(d.subtotal ?? d.unitPrice * d.quantity)}</td>
      </tr>
    `).join('');

    const paymentsHtml = payments.map((p: any) => `
      <tr>
        <td>${p.method}</td>
        <td style="text-align:right">${formatMoney(p.amount)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
  h2 { text-align: center; font-size: 14px; margin: 4px 0; }
  p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .total { font-weight: bold; font-size: 14px; }
  .center { text-align: center; }
</style>
</head>
<body>
<h2>Novedades Maritex</h2>
<p class="center">${docLabel}</p>
<p class="center">${(sale as any).fullInvoiceNumber ?? ''}</p>
<div class="divider"></div>
<p>Fecha: ${formatDate((sale as any).createdAt)}</p>
${customer ? `<p>Cliente: ${customer.name ?? ''} ${customer.surname ?? ''}`.trim() + `</p>` : ''}
<div class="divider"></div>
<table>
  <thead>
    <tr>
      <th style="text-align:left">Descripción</th>
      <th style="text-align:right">Cant</th>
      <th style="text-align:right">P.U.</th>
      <th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>${itemsHtml}</tbody>
</table>
<div class="divider"></div>
<table>
  <tr class="total">
    <td>TOTAL</td>
    <td style="text-align:right">${formatMoney((sale as any).totalAmount)}</td>
  </tr>
</table>
<div class="divider"></div>
<table>${paymentsHtml}</table>
<div class="divider"></div>
<p class="center">¡Gracias por su compra!</p>
</body>
</html>`;
  }
}
