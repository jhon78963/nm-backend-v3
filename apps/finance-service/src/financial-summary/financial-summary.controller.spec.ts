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
  period: '2026-08',
  warehouseId: 'warehouse-uuid',
  sales: {
    count: 120,
    totalRevenue: 48000,
  },
  cashflow: {
    income: 5000,
    expense: 8000,
    net: -3000,
    payroll: 4800,
  },
  accumulated: {
    currentCash: 13000,
    currentDigital: 7000,
    total: 20000,
    lastTransferMonth: '2026-07',
  },
  topExpenseCategories: [
    { category: 'Alquiler', amount: 3000 },
    { category: 'Servicios', amount: 1500 },
  ],
  estimatedMargin: 35200,
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
    it('should return consolidated financial summary for the warehouse and month', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      const result = await controller.getSummary(mockUser, '2026-08');
      expect(service.getSummary).toHaveBeenCalledWith('warehouse-uuid', '2026-08');
      expect(result).toMatchObject({
        period: '2026-08',
        warehouseId: 'warehouse-uuid',
      });
    });

    it('should include sales, cashflow and accumulated data', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      const result = await controller.getSummary(mockUser, '2026-08');
      expect(result).toHaveProperty('sales');
      expect(result).toHaveProperty('cashflow');
      expect(result).toHaveProperty('accumulated');
      expect(result).toHaveProperty('topExpenseCategories');
    });

    it('should expose estimated margin', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      const result = await controller.getSummary(mockUser, '2026-08');
      expect(result).toMatchObject({ estimatedMargin: 35200 });
    });

    it('should use warehouseId from JWT, not from query', async () => {
      service.getSummary.mockResolvedValue(mockSummary as any);
      await controller.getSummary(mockUser, '2026-08');
      expect(service.getSummary).toHaveBeenCalledWith('warehouse-uuid', '2026-08');
    });
  });
});
