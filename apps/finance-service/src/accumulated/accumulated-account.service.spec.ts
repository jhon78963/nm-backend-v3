import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccumulatedAccountService } from './accumulated-account.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockDb = {
  accumulatedAccountSetting: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  accumulatedAccountTransfer: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  cashMovement: {
    aggregate: jest.fn(),
  },
};

function makeSetting(warehouseId: string) {
  return {
    id: faker.string.uuid(),
    warehouseId,
    cashBalance: 5000.00,
    digitalBalance: 3000.00,
    trackingStartMonth: '2026-01',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE: AccumulatedAccountService
// ═══════════════════════════════════════════════════════════════════════════════

describe('AccumulatedAccountService', () => {
  let service: AccumulatedAccountService;
  const warehouseId = faker.string.uuid();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccumulatedAccountService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AccumulatedAccountService>(AccumulatedAccountService);
    jest.clearAllMocks();
  });

  // ── showSettings ──────────────────────────────────────────────────────────

  describe('showSettings()', () => {
    it('retorna la configuración cuando existe', async () => {
      const setting = makeSetting(warehouseId);
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(setting);

      const result = await service.showSettings(warehouseId);

      expect(result.cashBalance).toBe(5000.00);
    });

    it('lanza NotFoundException si no está inicializada', async () => {
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(null);

      await expect(service.showSettings(faker.string.uuid())).rejects.toThrow(NotFoundException);
    });
  });

  // ── initializeSettings ────────────────────────────────────────────────────

  describe('initializeSettings()', () => {
    it('crea la configuración si no existía', async () => {
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(null);
      mockDb.accumulatedAccountSetting.create.mockResolvedValue(makeSetting(warehouseId));

      await service.initializeSettings({
        warehouseId,
        cashBalance: 5000,
        digitalBalance: 3000,
        trackingStartMonth: '2026-08',
      });

      expect(mockDb.accumulatedAccountSetting.create).toHaveBeenCalledTimes(1);
    });

    it('lanza BadRequestException si ya fue inicializada (no doble-inicialización)', async () => {
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(makeSetting(warehouseId));

      await expect(
        service.initializeSettings({
          warehouseId,
          cashBalance: 1000,
          digitalBalance: 500,
          trackingStartMonth: '2026-08',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── monthEndPreview ───────────────────────────────────────────────────────

  describe('monthEndPreview()', () => {
    function setupPreviewMocks(cashIn = 0, cashOut = 0, digitalIn = 0, digitalOut = 0) {
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(makeSetting(warehouseId));
      mockDb.accumulatedAccountTransfer.findFirst.mockResolvedValue(null); // Sin transferencias previas
      mockDb.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: cashIn } })       // INCOME CASH
        .mockResolvedValueOnce({ _sum: { amount: cashOut } })      // EXPENSE CASH
        .mockResolvedValueOnce({ _sum: { amount: digitalIn } })    // INCOME digital
        .mockResolvedValueOnce({ _sum: { amount: digitalOut } });  // EXPENSE digital
    }

    it('calcula saldo proyectado correctamente desde el saldo inicial', async () => {
      setupPreviewMocks(2000, 500, 1000, 200);
      // cashBalance inicial: 5000, digitalBalance: 3000
      // projected.cash = 5000 + 2000 - 500 = 6500
      // projected.digital = 3000 + 1000 - 200 = 3800

      const result = await service.monthEndPreview(warehouseId, '2026-08');

      expect(result.projected.cash).toBeCloseTo(6500, 0);
      expect(result.projected.digital).toBeCloseTo(3800, 0);
    });

    it('usa el saldo del último cierre como apertura cuando existe un transfer previo', async () => {
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(makeSetting(warehouseId));
      mockDb.accumulatedAccountTransfer.findFirst.mockResolvedValue({
        closingCashAmount: 8000,    // Saldo real del cierre anterior
        closingDigitalAmount: 4500,
        transferMonth: '2026-07',
      });
      mockDb.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 300 } })
        .mockResolvedValueOnce({ _sum: { amount: 500 } })
        .mockResolvedValueOnce({ _sum: { amount: 100 } });

      const result = await service.monthEndPreview(warehouseId, '2026-08');

      expect(result.opening.cash).toBe(8000);    // Del último transfer, no del setting inicial
      expect(result.opening.digital).toBe(4500);
    });

    it('retorna projected.cash = opening cuando no hay movimientos del mes', async () => {
      setupPreviewMocks(0, 0, 0, 0);

      const result = await service.monthEndPreview(warehouseId, '2026-08');

      expect(result.projected.cash).toBe(5000);    // Igual al opening (sin movimientos)
      expect(result.projected.digital).toBe(3000);
    });
  });

  // ── recordTransfer ────────────────────────────────────────────────────────

  describe('recordTransfer()', () => {
    it('lanza BadRequestException si ya existe un cierre para ese mes', async () => {
      mockDb.accumulatedAccountSetting.findUnique.mockResolvedValue(makeSetting(warehouseId));
      mockDb.accumulatedAccountTransfer.findFirst.mockResolvedValue({
        id: faker.string.uuid(),
        transferMonth: '2026-08',
      });

      await expect(
        service.recordTransfer(
          { warehouseId, month: '2026-08', cashAmount: 6000, digitalAmount: 3500 },
          faker.string.uuid(),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
