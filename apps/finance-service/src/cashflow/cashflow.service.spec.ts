import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CashflowService } from './cashflow.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';
import { MovementType, CashPaymentMethod } from './dto/create-cash-movement.dto';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeMovement(overrides = {}) {
  return {
    id: faker.string.uuid(),
    warehouseId: faker.string.uuid(),
    type: 'INCOME',
    amount: 150.00,
    category: 'Venta directa',
    paymentMethod: 'CASH',
    date: new Date(),
    accountingMonth: '2026-08',
    isDeleted: false,
    vouchers: [],
    ...overrides,
  };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
  cashMovement: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE: CashflowService
// ═══════════════════════════════════════════════════════════════════════════════

describe('CashflowService', () => {
  let service: CashflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashflowService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CashflowService>(CashflowService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crea un movimiento de caja con todos los campos requeridos', async () => {
      const movement = makeMovement();
      mockDb.cashMovement.create.mockResolvedValue(movement);

      const dto = {
        warehouseId: movement.warehouseId,
        type: MovementType.INCOME,
        amount: 150.00,
        category: 'Venta directa',
        paymentMethod: CashPaymentMethod.CASH,
        date: '2026-08-25',
        accountingMonth: '2026-08',
      };

      const result = await service.create(dto, faker.string.uuid());

      expect(mockDb.cashMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INCOME',
            amount: 150.00,
            category: 'Venta directa',
          }),
        }),
      );
      expect(result.id).toBe(movement.id);
    });
  });

  // ── delete (soft-delete) ──────────────────────────────────────────────────

  describe('delete()', () => {
    it('hace soft-delete (isDeleted: true), nunca elimina físicamente', async () => {
      const movement = makeMovement();
      mockDb.cashMovement.findFirst.mockResolvedValue(movement);
      mockDb.cashMovement.update.mockResolvedValue({ ...movement, isDeleted: true });

      await service.delete(movement.id);

      expect(mockDb.cashMovement.update).toHaveBeenCalledWith({
        where: { id: movement.id },
        data: { isDeleted: true },
      });
    });

    it('lanza NotFoundException si el movimiento no existe', async () => {
      mockDb.cashMovement.findFirst.mockResolvedValue(null);

      await expect(service.delete(faker.string.uuid())).rejects.toThrow(NotFoundException);
    });
  });

  // ── getDaily ──────────────────────────────────────────────────────────────

  describe('getDaily()', () => {
    it('calcula correctamente income, expense y closingBalance', async () => {
      const warehouseId = faker.string.uuid();
      mockDb.cashMovement.findMany.mockResolvedValue([
        makeMovement({ type: 'INCOME', amount: 500 }),
        makeMovement({ type: 'INCOME', amount: 300 }),
        makeMovement({ type: 'EXPENSE', amount: 150 }),
      ]);
      // Balance previo (días anteriores)
      mockDb.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } }) // prevIncome
        .mockResolvedValueOnce({ _sum: { amount: 200 } });  // prevExpense

      const result = await service.getDaily(warehouseId, '2026-08-25');

      expect(result.totalIncome).toBe(800);
      expect(result.totalExpense).toBe(150);
      expect(result.openingBalance).toBe(800);    // 1000 - 200
      expect(result.closingBalance).toBe(1450);   // 800 + 800 - 150
    });

    it('retorna openingBalance = 0 si no hay movimientos previos', async () => {
      mockDb.cashMovement.findMany.mockResolvedValue([]);
      mockDb.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getDaily(faker.string.uuid(), '2026-08-01');

      expect(result.openingBalance).toBe(0);
      expect(result.closingBalance).toBe(0);
    });
  });

  // ── getMonthlyReport ──────────────────────────────────────────────────────

  describe('getMonthlyReport()', () => {
    it('calcula netBalance = totalIncome - totalExpense', async () => {
      mockDb.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 12000 }, _count: { id: 40 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 4500  }, _count: { id: 15 } }); // expense
      mockDb.cashMovement.groupBy
        .mockResolvedValueOnce([]) // byCategory
        .mockResolvedValueOnce([]); // byPaymentMethod

      const result = await service.getMonthlyReport('2026-08');

      expect(result.totalIncome).toBe(12000);
      expect(result.totalExpense).toBe(4500);
      expect(result.netBalance).toBe(7500);
    });

    it('filtra por warehouseId cuando se provee', async () => {
      const warehouseId = faker.string.uuid();
      mockDb.cashMovement.aggregate
        .mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } });
      mockDb.cashMovement.groupBy.mockResolvedValue([]);

      await service.getMonthlyReport('2026-08', warehouseId);

      expect(mockDb.cashMovement.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ warehouseId }),
        }),
      );
    });
  });
});
