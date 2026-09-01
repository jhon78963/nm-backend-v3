import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { DatabaseService } from '@app/database';
import { SunatService } from '../sunat/sunat.service';
import { formatAmountInWords } from './utils/ticket-amount-words.util';
import {
  emailForTicket,
  escapeHtml,
  formatMoney,
  formatTicketDate,
  paymentLabel,
  upper,
} from './utils/ticket-format.util';
import { embedLogoSrc } from './utils/ticket-logo.util';

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

@Injectable()
export class TicketRenderService {
  private template?: Handlebars.TemplateDelegate;

  constructor(
    private readonly db: DatabaseService,
    private readonly sunat: SunatService,
    private readonly config: ConfigService,
  ) {}

  async render(saleId: string): Promise<string> {
    const sale = await this.db.sale.findFirst({
      where: { id: saleId, isDeleted: false },
      include: {
        customer: true,
        details: true,
        payments: true,
        warehouse: {
          include: { tenant: { include: { setting: true } } },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada.');
    }

    const setting = sale.warehouse.tenant.setting;
    const social = (setting?.socialLinks ?? {}) as SocialLinks;
    const documentType = (sale.documentType ?? 'TICKET').toUpperCase();
    const isFactura = documentType === 'FACTURA';
    const isBoleta = documentType === 'BOLETA';
    const isFiscal = isFactura || isBoleta;

    const total = Number(sale.totalAmount);
    const taxableBase = Number(sale.taxableBase ?? total / 1.18);
    const igv = Number(sale.igv ?? total - taxableBase);

    const [qrSvg, xmlHash] = isFiscal
      ? await Promise.all([
          this.sunat.fetchTicketQr(sale.id),
          this.sunat.fetchTicketXmlHash(sale.id),
        ])
      : [null, null];

    const logoSrc = await embedLogoSrc(setting?.logoUrl);
    const legalName = setting?.legalName ?? this.config.get('SUNAT_RAZON_SOCIAL', '');
    const tradeName = setting?.tradeName ?? this.config.get('SUNAT_NOMBRE_COMERCIAL', legalName);

    const template = await this.getTemplate();

    return template({
      title: escapeHtml(sale.fullInvoiceNumber ?? sale.code ?? sale.id),
      logoSrc,
      tradeName: escapeHtml(upper(tradeName)),
      legalName: escapeHtml(upper(legalName)),
      showLegalName: Boolean(legalName && legalName !== tradeName),
      address: escapeHtml(upper(setting?.address ?? this.config.get('SUNAT_DIRECCION', ''))),
      district: escapeHtml(upper(setting?.district ?? this.config.get('SUNAT_DISTRITO', ''))),
      province: escapeHtml(upper(setting?.province ?? this.config.get('SUNAT_PROVINCIA', ''))),
      department: escapeHtml(upper(setting?.department ?? this.config.get('SUNAT_DEPARTAMENTO', ''))),
      phone: setting?.phone ?? '',
      emailHtml: emailForTicket(setting?.email),
      website: setting?.website ?? '',
      facebook: social.facebook ?? '',
      instagram: social.instagram ?? '',
      tiktok: social.tiktok ?? '',
      hasContact: Boolean(setting?.phone || setting?.email),
      hasSocial: Boolean(social.facebook || social.instagram || social.tiktok),
      isFactura,
      isBoleta,
      isFiscal,
      ruc: setting?.ruc ?? this.config.get('SUNAT_RUC', ''),
      fullNumber: escapeHtml(sale.fullInvoiceNumber ?? sale.code ?? ''),
      issuedAt: formatTicketDate(sale.createdAt),
      hasCustomer: Boolean(sale.customer?.documentNumber),
      customerName: escapeHtml(upper(sale.customer?.name ?? '')),
      customerDocType: escapeHtml(upper(sale.customer?.documentType ?? 'DOC')),
      customerDocNumber: escapeHtml(sale.customer?.documentNumber ?? ''),
      customerLabel: isFactura ? 'SEÑORES:' : 'CLIENTE:',
      showDefaultDni: isBoleta && !sale.customer?.documentNumber,
      details: sale.details.map((detail) => ({
        quantity: detail.quantity,
        productName: escapeHtml(detail.productNameSnapshot),
        sizeName: escapeHtml(detail.sizeSnapshot),
        colorName: escapeHtml(detail.colorSnapshot ?? '-'),
        unitPrice: formatMoney(Number(detail.unitPrice)),
        lineTotal: formatMoney(Number(detail.subtotal)),
      })),
      taxableBase: formatMoney(taxableBase),
      igv: formatMoney(igv),
      total: formatMoney(total),
      amountInWords: formatAmountInWords(total),
      payments: sale.payments.map((payment) => ({
        label: paymentLabel(payment.method),
        amount: formatMoney(Number(payment.amount)),
      })),
      hasPayments: sale.payments.length > 0,
      fallbackPaymentLabel: paymentLabel(sale.paymentMethod),
      qrSvg,
      xmlHash,
      footerNote: escapeHtml(setting?.ticketFooterNote ?? 'NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES'),
    });
  }

  private async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (this.template) return this.template;

    const templatePath = join(this.getTemplatesDir(), 'ticket.hbs');
    const source = await readFile(templatePath, 'utf-8');
    this.template = Handlebars.compile(source);
    return this.template;
  }

  private getTemplatesDir(): string {
    return join(__dirname, 'templates');
  }
}
