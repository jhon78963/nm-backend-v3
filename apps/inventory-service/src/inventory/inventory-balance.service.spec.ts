import { Test, TestingModule } from '@nestjs/testing';
import { InventoryBalanceService } from './inventory-balance.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockDb = {
  $transaction: jest.fn(),
  inventoryBalance: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  inventoryMovement: {
    create: jest.fn(),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE: InventoryBalanceService
// ═══════════════════════════════════════════════════════════════════════════════

describe('InventoryBalanceService', () => {
  let service: InventoryBalanceService;

  const warehouseId    = faker.string.uuid();
  const productSizeId  = faker.string.uuid();
  const colorId        = faker.string.uuid();
  const userId         = faker.string.uuid();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryBalanceService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<InventoryBalanceService>(InventoryBalanceService);
    jest.clearAllMocks();
  });

  // ── getBalance ────────────────────────────────────────────────────────────

  describe('getBalance()', () => {
    it('retorna la cantidad del balance existente', async () => {
      mockDb.inventoryBalance.findFirst.mockResolvedValue({ quantity: 42 });

      const qty = await service.getBalance(warehouseId, productSizeId, colorId);

      expect(qty).toBe(42);
    });

    it('retorna 0 si no existe balance (producto nuevo sin stock)', async () => {
      mockDb.inventoryBalance.findFirst.mockResolvedValue(null);

      const qty = await service.getBalance(warehouseId, productSizeId, colorId);

      expect(qty).toBe(0);
    });
  });

  // ── adjust ────────────────────────────────────────────────────────────────

  describe('adjust()', () => {
    function setupTransactionMock(balanceQuantity: number) {
      const txMock = {
        inventoryBalance: {
          upsert: jest.fn().mockResolvedValue({ quantity: balanceQuantity }),
        },
        inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
      };
      mockDb.$transaction.mockImplementation(
        (fn: (tx: typeof txMock) => unknown) => fn(txMock),
      );
      return txMock;
    }

    it('crea un movement IN y hace upsert del balance al recibir stock (delta positivo)', async () => {
      const tx = setupTransactionMock(10);

      await service.adjust({
        warehouseId, productSizeId, colorId,
        delta: 10,
        movementType: 'PURCHASE',
        createdById: userId,
      });

      expect(tx.inventoryBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ quantity: { increment: 10 } }),
        }),
      );
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ direction: 'IN', quantity: 10 }),
        }),
      );
    });

    it('crea un movement OUT al descontar stock (delta negativo — equivale a una venta)', async () => {
      const tx = setupTransactionMock(5);

      await service.adjust({
        warehouseId, productSizeId, colorId,
        delta: -3,
        movementType: 'SALE',
        createdById: userId,
      });

      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ direction: 'OUT', quantity: 3 }),
        }),
      );
    });

    it('pasa balanceAfter correcto al movement (snapshot del stock tras el movimiento)', async () => {
      const tx = setupTransactionMock(15);

      await service.adjust({
        warehouseId, productSizeId, colorId,
        delta: 5,
        movementType: 'ADJUSTMENT',
        createdById: userId,
      });

      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balanceAfter: 15 }),
        }),
      );
    });

    it('vincula el movement con referenceId y referenceType cuando se provee (ej: Sale)', async () => {
      const tx = setupTransactionMock(20);
      const saleId = faker.string.uuid();

      await service.adjust({
        warehouseId, productSizeId, colorId,
        delta: -2,
        movementType: 'SALE',
        referenceId: saleId,
        referenceType: 'Sale',
        createdById: userId,
      });

      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referenceId: saleId,
            referenceType: 'Sale',
          }),
        }),
      );
    });
  });

  // ── bulkAdjust ────────────────────────────────────────────────────────────

  describe('bulkAdjust()', () => {
    it('ejecuta N upserts en una sola transacción (batch atómico)', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ quantity: 5 });
      mockDb.$transaction.mockResolvedValue([]);
      // En bulkAdjust usamos el cliente directo (no tx callback), sino array de promesas
      mockDb.inventoryBalance.upsert = upsertMock;

      const adjustments = [
        { warehouseId, productSizeId, colorId, delta: 3, movementType: 'PURCHASE', createdById: userId },
        { warehouseId, productSizeId: faker.string.uuid(), colorId, delta: 5, movementType: 'PURCHASE', createdById: userId },
      ];

      await service.bulkAdjust(adjustments);

      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
