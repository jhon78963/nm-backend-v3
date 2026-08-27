import { Test, TestingModule } from '@nestjs/testing';
import { FinancialSummaryController } from './financial-summary.controller';
import { FinancialSummaryService } from './financial-summary.service';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const mockUser: AuthenticatedUser = {
  id: 'user-uuid',
  username: 'admin',
  tenantId: 'tenant-uuid',
  warehouseId: 'warehouse-uuid',
  roles: ['Admin'],
  mustChangePassword: false,
};

const mockSummary = {
  cards: {
    cash_total: { amount: 20000, cash: 13000, digital: 7000 },
    sales_income: { amount: 48000, growth: 12.5 },
    expenses: { amount: 8000, description: 'Administrativos: S/ 5,200.00 · Tienda: S/ 2,800.00' },
    stock_investment: { amount: 1500, description: 'Compras recuperables' },
  },
  recent_transactions: [
    {
      id: 'sale-1',
      concept: 'Venta POS #0001',
      category: 'Venta',
      date: '26/08/2026 12:00 PM',
      method: 'CASH',
      amount: 120,
      type: 'income',
    },
  ],
};

describe('FinancialSummaryController', () => {
  let controller: FinancialSummaryController;
  let service: jest.Mocked<FinancialSummaryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialSummaryController],
      providers: [
        {
          provide: FinancialSummaryService,
          useValue: {
            getSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FinancialSummaryController>(FinancialSummaryController);
    service = module.get(FinancialSummaryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should return Laravel-compatible cards and recent transactions', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      const result = await controller.getSummary(mockUser, '2026-08');
      expect(service.getSummary).toHaveBeenCalledWith('warehouse-uuid', '2026-08');
      expect(result).toHaveProperty('cards');
      expect(result).toHaveProperty('recent_transactions');
      expect(result.cards).toHaveProperty('cash_total');
      expect(result.cards).toHaveProperty('sales_income');
    });

    it('should default month to current month when omitted', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      await controller.getSummary(mockUser);
      expect(service.getSummary).toHaveBeenCalledWith(
        'warehouse-uuid',
        expect.stringMatching(/^\d{4}-\d{2}$/),
      );
    });

    it('should use warehouseId from JWT, not from query', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      await controller.getSummary(mockUser, '2026-08');
      expect(service.getSummary).toHaveBeenCalledWith('warehouse-uuid', '2026-08');
    });
  });
});
