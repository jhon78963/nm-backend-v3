import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentSeriesService } from './document-series.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';

const mockDb = {
  documentSeries: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE: DocumentSeriesService
// ═══════════════════════════════════════════════════════════════════════════════

describe('DocumentSeriesService', () => {
  let service: DocumentSeriesService;
  const warehouseId = faker.string.uuid();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentSeriesService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<DocumentSeriesService>(DocumentSeriesService);
    jest.clearAllMocks();
  });

  describe('getNextNumber()', () => {
    it('retorna la serie y correlativo actual cuando existe la configuración', async () => {
      mockDb.documentSeries.findFirst.mockResolvedValue({
        id: faker.string.uuid(),
        warehouseId,
        documentType: 'BOLETA',
        serie: 'B001',
        currentNumber: 42,
      });

      const result = await service.getNextNumber(warehouseId, 'BOLETA');

      expect(result).toEqual({ serie: 'B001', nextNumber: 42 });
    });

    it('lanza NotFoundException si no hay serie configurada para el warehouse', async () => {
      mockDb.documentSeries.findFirst.mockResolvedValue(null);

      await expect(service.getNextNumber(warehouseId, 'FACTURA')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('el mensaje de error incluye el tipo de documento para facilitar configuración', async () => {
      mockDb.documentSeries.findFirst.mockResolvedValue(null);

      const error = await service
        .getNextNumber(warehouseId, 'FACTURA')
        .catch((e: NotFoundException) => e);

      expect((error as NotFoundException).message).toContain('FACTURA');
    });
  });

  describe('incrementNumber()', () => {
    it('incrementa currentNumber en 1 usando la TX activa (operación atómica)', async () => {
      const txMock = {
        documentSeries: { update: jest.fn().mockResolvedValue({}) },
      };

      await service.incrementNumber(txMock, warehouseId, 'BOLETA', 'B001');

      expect(txMock.documentSeries.update).toHaveBeenCalledWith({
        where: {
          warehouseId_documentType_serie: {
            warehouseId,
            documentType: 'BOLETA',
            serie: 'B001',
          },
        },
        data: { currentNumber: { increment: 1 } },
      });
    });
  });
});
