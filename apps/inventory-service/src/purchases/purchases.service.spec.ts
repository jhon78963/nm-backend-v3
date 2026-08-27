import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { InventoryBalanceService } from '../inventory/inventory-balance.service';
import { DatabaseService } from '@app/database';
import { PurchaseCurrency } from './dto/register-bulk-purchase.dto';
import { faker } from '@faker-js/faker';

// ─── Factories ────────────────────────────────────────────────────────────────

function makePurchase(overrides = {}) {
  return {
    id: faker.string.uuid(),
    warehouseId: faker.string.uuid(),
    vendorId: faker.string.uuid(),
    currency: 'PEN',
    totalAmount: 500.00,
    status: 'REGISTERED',
    isDeleted: false,
    lines: [],
    ...overrides,
  };
}

function makePurchaseLine(purchaseId: string, overrides = {}) {
  return {
    id: faker.string.uuid(),
    purchaseId,
    productId: faker.string.uuid(),
    sizeId: faker.string.uuid(),
    productSizeId: faker.string.uuid(),
    purchasePrice: 25.00,
    quantity: 10,
    hasColorBreakdown: false,
    colorDeltas: [],
    ...overrides,
  };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

function buildTxMock(purchaseOverrides = {}) {
  const purchaseId = faker.string.uuid();
  return {
    purchase: {
      create: jest.fn().mockResolvedValue(makePurchase({ id: purchaseId, ...purchaseOverrides })),
      update: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(makePurchase({ id: purchaseId })),
    },
    purchaseLine: {
      create: jest.fn().mockResolvedValue(makePurchaseLine(purchaseId)),
    },
    purchaseLineColorDelta: { create: jest.fn().mockResolvedValue({}) },
    inventoryBalance: {
      upsert: jest.fn().mockResolvedValue({ quantity: 10 }),
      update: jest.fn().mockResolvedValue({ quantity: 5 }),
    },
    inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
    productSize: {
      findFirst: jest.fn().mockResolvedValue({ id: faker.string.uuid() }),
    },
    color: { findFirst: jest.fn().mockResolvedValue({ id: faker.string.uuid() }) },
  };
}

const mockDb = {
  $transaction: jest.fn(),
  purchase: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockBalance = { adjust: jest.fn(), bulkAdjust: jest.fn() };

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE: PurchasesService
// ═══════════════════════════════════════════════════════════════════════════════

describe('PurchasesService', () => {
  let service: PurchasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: InventoryBalanceService, useValue: mockBalance },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    jest.clearAllMocks();
  });

  // ── registerBulk ──────────────────────────────────────────────────────────

  describe('registerBulk()', () => {
    it('crea cabecera + líneas + movimientos en una sola transacción', async () => {
      const tx = buildTxMock();
      mockDb.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(tx));

      const warehouseId = faker.string.uuid();
      const dto = {
        warehouseId,
        currency: PurchaseCurrency.PEN,
        lines: [
          {
            productId: faker.string.uuid(),
            sizeId: faker.string.uuid(),
            purchasePrice: 25.00,
            quantity: 10,
          },
        ],
      };

      await service.registerBulk(dto, faker.string.uuid());

      expect(tx.purchase.create).toHaveBeenCalledTimes(1);
      expect(tx.purchaseLine.create).toHaveBeenCalledTimes(1);
      expect(tx.inventoryBalance.upsert).toHaveBeenCalledTimes(1);
      expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
    });

    it('calcula totalAmount correctamente sumando líneas', async () => {
      const tx = buildTxMock();
      mockDb.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(tx));

      const dto = {
        warehouseId: faker.string.uuid(),
        currency: PurchaseCurrency.PEN,
        lines: [
          { productId: faker.string.uuid(), sizeId: faker.string.uuid(), purchasePrice: 20, quantity: 5 },
          { productId: faker.string.uuid(), sizeId: faker.string.uuid(), purchasePrice: 30, quantity: 3 },
        ],
      };

      await service.registerBulk(dto, faker.string.uuid());

      expect(tx.purchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmount: 190 }), // 20*5 + 30*3 = 190
        }),
      );
    });

    it('crea colorDeltas y ajusta balance por color cuando se especifica desglose', async () => {
      const colorId1 = faker.string.uuid();
      const colorId2 = faker.string.uuid();
      const tx = buildTxMock();
      mockDb.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(tx));

      const dto = {
        warehouseId: faker.string.uuid(),
        currency: PurchaseCurrency.PEN,
        lines: [
          {
            productId: faker.string.uuid(),
            sizeId: faker.string.uuid(),
            purchasePrice: 25,
            quantity: 6,
            colorDeltas: [
              { colorId: colorId1, quantity: 4 },
              { colorId: colorId2, quantity: 2 },
            ],
          },
        ],
      };

      await service.registerBulk(dto, faker.string.uuid());

      expect(tx.purchaseLineColorDelta.create).toHaveBeenCalledTimes(2);
      expect(tx.inventoryBalance.upsert).toHaveBeenCalledTimes(2);
    });

    it('lanza BadRequestException si total de colorDeltas ≠ quantity de línea', async () => {
      const tx = buildTxMock();
      mockDb.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(tx));

      const dto = {
        warehouseId: faker.string.uuid(),
        currency: PurchaseCurrency.PEN,
        lines: [
          {
            productId: faker.string.uuid(),
            sizeId: faker.string.uuid(),
            purchasePrice: 25,
            quantity: 10,       // Total esperado: 10
            colorDeltas: [
              { colorId: faker.string.uuid(), quantity: 4 }, // Solo suma 4 → ≠ 10
            ],
          },
        ],
      };

      await expect(service.registerBulk(dto, faker.string.uuid())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('cambia el status a CANCELLED y crea movements de reversión OUT', async () => {
      const purchaseId = faker.string.uuid();
      const line = makePurchaseLine(purchaseId, { hasColorBreakdown: false, quantity: 5 });
      const purchase = makePurchase({ id: purchaseId, status: 'REGISTERED', lines: [line] });

      mockDb.purchase.findFirst.mockResolvedValue(purchase);

      const txMock = {
        purchase: { update: jest.fn().mockResolvedValue({ ...purchase, status: 'CANCELLED' }) },
        inventoryBalance: { update: jest.fn().mockResolvedValue({}) },
        inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
        color: { findFirst: jest.fn().mockResolvedValue({ id: faker.string.uuid() }) },
      };
      mockDb.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(txMock));

      await service.cancel(purchaseId, 'Error en pedido', faker.string.uuid());

      expect(txMock.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
      expect(txMock.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ direction: 'OUT', movementType: 'PURCHASE_CANCELLED' }),
        }),
      );
    });

    it('lanza NotFoundException si la compra no existe', async () => {
      mockDb.purchase.findFirst.mockResolvedValue(null);

      await expect(
        service.cancel(faker.string.uuid(), 'Razón', faker.string.uuid()),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la compra ya está cancelada', async () => {
      const purchase = makePurchase({ status: 'CANCELLED' });
      mockDb.purchase.findFirst.mockResolvedValue(purchase);

      await expect(
        service.cancel(purchase.id, 'Razón', faker.string.uuid()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retorna lista paginada de compras por warehouse', async () => {
      const purchases = [makePurchase(), makePurchase()];
      mockDb.$transaction.mockResolvedValue([purchases, 2]);

      const result = await service.findAll(faker.string.uuid(), 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({ total: 2, lastPage: 1 });
    });
  });
});
