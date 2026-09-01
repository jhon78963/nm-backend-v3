import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExcelColumnDefinition, ExcelRow } from './document-client.types';

@Injectable()
export class DocumentClientService {
  private readonly logger = new Logger(DocumentClientService.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('DOCUMENT_SERVICE_URL', 'http://localhost:3011');
    this.serviceKey = config.get<string>('DOCUMENT_SERVICE_KEY', '');
  }

  async generatePdf(templateName: string, data: unknown): Promise<Buffer> {
    const url = `${this.baseUrl}/v1/render/pdf`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-key': this.serviceKey,
        },
        body: JSON.stringify({ templateName, data }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new InternalServerErrorException(
          `document-service → ${response.status}: ${text}`,
        );
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      this.logger.error(`PDF render failed: ${(err as Error).message}`);
      throw err instanceof InternalServerErrorException
        ? err
        : new InternalServerErrorException('Error al generar PDF.');
    }
  }

  async generateExcel(columns: ExcelColumnDefinition[], rows: ExcelRow[]): Promise<Buffer> {
    const url = `${this.baseUrl}/v1/render/excel`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-key': this.serviceKey,
        },
        body: JSON.stringify({ columns, rows }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new InternalServerErrorException(
          `document-service → ${response.status}: ${text}`,
        );
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      this.logger.error(`Excel render failed: ${(err as Error).message}`);
      throw err instanceof InternalServerErrorException
        ? err
        : new InternalServerErrorException('Error al generar Excel.');
    }
  }
}
