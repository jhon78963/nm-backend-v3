import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@app/database';

export interface SunatEmitResult {
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING_EMISSION' | 'ERROR';
  invoiceNumber?: string;
  sunatCode?: string;
  description?: string;
}

export interface DniLookupResult {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
}

export interface RucLookupResult {
  razonSocial: string;
  ruc: string;
  direccion?: string;
}

/**
 * SunatService — Proxy hacia el nm-backend (Laravel + Greenter).
 *
 * DISEÑO DELIBERADO:
 * La lógica de firma XML, CDR y UBL 2.1 permanece en el nm-backend Laravel
 * durante toda la migración. Este servicio es un HTTP client que delega
 * esas operaciones al sidecar de facturación electrónica.
 *
 * Para emitir: pos-service ──POST /api/fiscal/emit──> nm-backend
 * Para anular: pos-service ──POST /api/fiscal/void──> nm-backend
 * Para DNI/RUC: pos-service ──GET /api/fiscal/lookup/{type}/{number}──> nm-backend
 *               que a su vez llama a apis.net.pe con SUNAT_TOKEN
 *
 * Cuando se implemente el equivalente TypeScript (UBL 2.1 + node-forge),
 * solo se cambia este servicio; el resto del pos-service no cambia.
 */
@Injectable()
export class SunatService {
  private readonly logger = new Logger(SunatService.name);
  private readonly backendUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.backendUrl = config.get('SUNAT_BACKEND_URL', 'http://localhost:8000');
    this.apiKey = config.get('SUNAT_BACKEND_API_KEY', '');
  }

  // ── Emisión de documento fiscal ────────────────────────────────────────────

  async emit(saleId: string, documentType: string): Promise<SunatEmitResult> {
    try {
      const sale = await this.db.sale.findFirst({
        where: { id: saleId },
        include: {
          details: true,
          payments: true,
          customer: true,
        },
      });
      if (!sale) throw new Error(`Venta ${saleId} no encontrada.`);

      const response = await this.backendRequest<SunatEmitResult>(
        'POST',
        '/api/fiscal/emit',
        { saleId, documentType, sale },
      );

      // Actualizar el estado SUNAT en la venta
      await this.db.sale.update({
        where: { id: saleId },
        data: {
          sunatStatus: response.status,
          fullInvoiceNumber: response.invoiceNumber ?? sale.fullInvoiceNumber,
        },
      });

      // Registrar log (equivale a ElectronicDocumentLog de Laravel)
      await this.db.electronicDocumentLog.create({
        data: {
          saleId,
          action: 'ISSUE',
          requestPayload: { documentType },
          responsePayload: response as object,
          sunatCode: response.sunatCode,
        },
      });

      return response;
    } catch (err) {
      this.logger.error(`Error al emitir ${documentType} para venta ${saleId}`, err);
      return { status: 'ERROR', description: (err as Error).message };
    }
  }

  // ── Anulación ─────────────────────────────────────────────────────────────

  async void(saleId: string, reason: string): Promise<SunatEmitResult> {
    try {
      const response = await this.backendRequest<SunatEmitResult>(
        'POST',
        '/api/fiscal/void',
        { saleId, reason },
      );
      await this.db.electronicDocumentLog.create({
        data: {
          saleId,
          action: 'VOID',
          requestPayload: { reason },
          responsePayload: response as object,
          sunatCode: response.sunatCode,
        },
      });
      return response;
    } catch (err) {
      this.logger.error(`Error al anular venta ${saleId}`, err);
      return { status: 'ERROR', description: (err as Error).message };
    }
  }

  // ── Consulta DNI/RUC (equivale a SunatService de Laravel via apis.net.pe) ─

  async lookupDni(dni: string): Promise<DniLookupResult> {
    try {
      return await this.backendRequest<DniLookupResult>('GET', `/api/fiscal/lookup/dni/${dni}`);
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar el DNI. Intenta nuevamente.');
    }
  }

  async lookupRuc(ruc: string): Promise<RucLookupResult> {
    try {
      return await this.backendRequest<RucLookupResult>('GET', `/api/fiscal/lookup/ruc/${ruc}`);
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar el RUC. Intenta nuevamente.');
    }
  }

  // ── Helper HTTP ───────────────────────────────────────────────────────────

  private async backendRequest<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.backendUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': this.apiKey,
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`nm-backend SUNAT sidecar → ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }
}
