import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DniApiResponse {
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}

interface RucApiResponse {
  razonSocial?: string;
  direccion?: string;
}

export interface DocumentLookupResult {
  documentType: 'DNI' | 'RUC';
  documentNumber: string;
  name: string;
}

/**
 * Consulta DNI/RUC en apis.net.pe — equivalente a SunatService de Laravel.
 */
@Injectable()
export class DocumentLookupService {
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('SUNAT_TOKEN', '');
  }

  async lookupDocument(docNumber: string): Promise<DocumentLookupResult> {
    if (docNumber.length === 8) {
      return this.lookupDni(docNumber);
    }

    if (docNumber.length === 11) {
      return this.lookupRuc(docNumber);
    }

    throw new NotFoundException({
      success: false,
      code: 'DOC_NOT_FOUND',
      message: 'El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos.',
    });
  }

  private async lookupDni(dni: string): Promise<DocumentLookupResult> {
    const url = `https://api.apis.net.pe/v2/reniec/dni?${new URLSearchParams({ numero: dni })}`;
    const data = await this.performGet<DniApiResponse>(
      url,
      'https://apis.net.pe/consulta-dni-api',
    );

    if (!data?.nombres) {
      throw new NotFoundException({
        success: false,
        code: 'DOC_NOT_FOUND',
        message: 'El documento no está registrado en SUNAT/RENIEC.',
      });
    }

    return {
      documentType: 'DNI',
      documentNumber: dni,
      name: `${data.nombres} ${data.apellidoPaterno ?? ''} ${data.apellidoMaterno ?? ''}`.trim(),
    };
  }

  private async lookupRuc(ruc: string): Promise<DocumentLookupResult> {
    const url = `https://api.apis.net.pe/v2/sunat/ruc?${new URLSearchParams({ numero: ruc })}`;
    const data = await this.performGet<RucApiResponse>(
      url,
      'http://apis.net.pe/api-ruc',
    );

    if (!data?.razonSocial) {
      throw new NotFoundException({
        success: false,
        code: 'DOC_NOT_FOUND',
        message: 'El documento no está registrado en SUNAT/RENIEC.',
      });
    }

    return {
      documentType: 'RUC',
      documentNumber: ruc,
      name: data.razonSocial.trim(),
    };
  }

  private async performGet<T>(url: string, referer: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Referer: referer,
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new NotFoundException({
          success: false,
          code: 'DOC_NOT_FOUND',
          message: 'El documento no está registrado en SUNAT/RENIEC.',
        });
      }

      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException({
          success: false,
          code: 'SUNAT_UNAVAILABLE',
          message: 'El servicio de SUNAT está inestable. Reintente en un momento.',
        });
      }

      if (response.status >= 500) {
        throw new ServiceUnavailableException({
          success: false,
          code: 'SUNAT_UNAVAILABLE',
          message: 'El servicio de SUNAT está inestable. Reintente en un momento.',
        });
      }

      if (!response.ok) {
        throw new ServiceUnavailableException({
          success: false,
          code: 'SUNAT_UNAVAILABLE',
          message: 'No se pudo consultar el documento. Intente nuevamente.',
        });
      }

      const text = await response.text();
      if (!text.trim()) {
        throw new ServiceUnavailableException({
          success: false,
          code: 'SUNAT_UNAVAILABLE',
          message: 'No se pudo consultar el documento. Intente nuevamente.',
        });
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ServiceUnavailableException({
          success: false,
          code: 'SUNAT_UNAVAILABLE',
          message: 'No se pudo consultar el documento. Intente nuevamente.',
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException({
          success: false,
          code: 'SUNAT_TIMEOUT',
          message: 'El servicio de SUNAT está inestable. Reintente en un momento.',
        });
      }

      throw new ServiceUnavailableException({
        success: false,
        code: 'SUNAT_UNAVAILABLE',
        message: 'No se pudo consultar el documento. Intente nuevamente.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
