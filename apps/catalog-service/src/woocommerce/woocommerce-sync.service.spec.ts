import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WoocommerceSyncService } from './woocommerce-sync.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';

// ─── Mock fetch global ────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Factories ────────────────────────────────────────────────────────────────
function makeDbProduct() {
  return {
    id: faker.string.uuid(),
    name: 'Polo Cuello V',
    description: 'Polo de algodón',
    wooStatus: 'publish',
    isDeleted: false,
    productSizes: [
      {
        size: { description: 'S' },
        productSizeColors: [
          { color: { description: 'Blanco' } },
          { color: { description: 'Negro' } },
        ],
        inventoryBalances: [{ quantity: 10, colorId: faker.string.uuid() }],
      },
    ],
  };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  woocommerceSyncMap: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const map: Record<string, string> = {
      WOOCOMMERCE_URL: 'https://tienda.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    };
    return map[key] ?? '';
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE: WoocommerceSyncService
// ═══════════════════════════════════════════════════════════════════════════════

describe('WoocommerceSyncService', () => {
  let service: WoocommerceSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WoocommerceSyncService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<WoocommerceSyncService>(WoocommerceSyncService);
    jest.clearAllMocks();
  });

  // ── syncProduct ───────────────────────────────────────────────────────────

  describe('syncProduct()', () => {
    it('crea producto en WooCommerce si no existe sync map', async () => {
      const product = makeDbProduct();
      mockDb.product.findFirst.mockResolvedValue(product);
      mockDb.woocommerceSyncMap.findFirst.mockResolvedValue(null);
      mockDb.woocommerceSyncMap.create.mockResolvedValue({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 123, name: product.name }),
      });

      const result = await service.syncProduct(product.id);

      expect(result).toMatchObject({ synced: true, wooId: 123 });
      expect(mockDb.woocommerceSyncMap.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: product.id,
            wooProductId: 123,
          }),
        }),
      );
    });

    it('actualiza producto existente en WooCommerce (PUT)', async () => {
      const product = makeDbProduct();
      const existingMap = { id: faker.string.uuid(), wooProductId: 456 };
      mockDb.product.findFirst.mockResolvedValue(product);
      mockDb.woocommerceSyncMap.findFirst.mockResolvedValue(existingMap);
      mockDb.woocommerceSyncMap.update.mockResolvedValue({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 456 }),
      });

      const result = await service.syncProduct(product.id);

      expect(result).toMatchObject({ synced: true, wooId: 456 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/456'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('retorna synced: false para producto inexistente', async () => {
      mockDb.product.findFirst.mockResolvedValue(null);

      const result = await service.syncProduct(faker.string.uuid());

      expect(result).toEqual({ synced: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('retorna synced: false y loguea el error si WooCommerce API falla', async () => {
      const product = makeDbProduct();
      mockDb.product.findFirst.mockResolvedValue(product);
      mockDb.woocommerceSyncMap.findFirst.mockResolvedValue(null);

      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

      const result = await service.syncProduct(product.id);

      expect(result).toEqual({ synced: false });
    });

    it('usa autenticación Basic Auth en headers de WooCommerce', async () => {
      const product = makeDbProduct();
      mockDb.product.findFirst.mockResolvedValue(product);
      mockDb.woocommerceSyncMap.findFirst.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 789 }),
      });
      mockDb.woocommerceSyncMap.create.mockResolvedValue({});

      await service.syncProduct(product.id);

      const [, fetchOpts] = mockFetch.mock.calls[0] as [string, RequestInit];
      const authHeader = (fetchOpts.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toMatch(/^Basic /);
      const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('ck_test:cs_test');
    });
  });
});
