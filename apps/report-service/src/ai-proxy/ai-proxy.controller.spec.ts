import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const mockUser: AuthenticatedUser = {
  id: 'user-uuid',
  username: 'admin',
  tenantId: 'tenant-uuid',
  warehouseId: 'warehouse-uuid',
  roles: ['Admin'],
  mustChangePassword: false,
};

const mockProductContext = {
  productId: 'product-uuid',
  salesHistory: [{ month: '2026-07', unitsSold: 32 }],
  currentStock: 20,
  avgPrice: 85,
};

const mockPricePrediction = {
  productId: 'product-uuid',
  suggestedPrice: 95.5,
  confidence: 0.87,
  factors: ['high_demand', 'low_stock'],
};

const mockDemandPrediction = {
  productId: 'product-uuid',
  horizonDays: 30,
  predictedUnits: 45,
  confidence: 0.81,
};

const mockInventoryReport = {
  warehouseId: 'warehouse-uuid',
  generatedAt: '2026-08-25T20:00:00Z',
  items: [
    { productId: 'product-uuid', name: 'Polo básico', stock: 20, recommendation: 'restock' },
  ],
};

describe('AiProxyController', () => {
  let controller: AiProxyController;
  let service: jest.Mocked<AiProxyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiProxyController],
      providers: [
        {
          provide: AiProxyService,
          useValue: {
            getProductContext: jest.fn(),
            predictPrice: jest.fn(),
            predictDemand: jest.fn(),
            getProductsInventoryReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiProxyController>(AiProxyController);
    service = module.get(AiProxyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProductContext', () => {
    it('should return product context from AI engine', async () => {
      service.getProductContext.mockResolvedValue(mockProductContext as any);
      const result = await controller.getProductContext('product-uuid');
      expect(service.getProductContext).toHaveBeenCalledWith('product-uuid');
      expect(result).toMatchObject({ productId: 'product-uuid', avgPrice: 85 });
    });

    it('should propagate ServiceUnavailableException when AI engine is down', async () => {
      service.getProductContext.mockRejectedValue(new ServiceUnavailableException());
      await expect(controller.getProductContext('product-uuid')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('predictPrice', () => {
    it('should forward productId and remaining body to service', async () => {
      const body = { productId: 'product-uuid', warehouseId: 'warehouse-uuid', month: '2026-08' };
      service.predictPrice.mockResolvedValue(mockPricePrediction as any);
      const result = await controller.predictPrice(body);
      expect(service.predictPrice).toHaveBeenCalledWith('product-uuid', {
        warehouseId: 'warehouse-uuid',
        month: '2026-08',
      });
      expect(result).toMatchObject({ suggestedPrice: 95.5 });
    });

    it('should propagate ServiceUnavailableException when AI engine is down', async () => {
      service.predictPrice.mockRejectedValue(new ServiceUnavailableException());
      await expect(
        controller.predictPrice({ productId: 'product-uuid' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('predictDemand', () => {
    it('should forward productId and remaining body to service', async () => {
      const body = { productId: 'product-uuid', warehouseId: 'warehouse-uuid', horizonDays: 30 };
      service.predictDemand.mockResolvedValue(mockDemandPrediction as any);
      const result = await controller.predictDemand(body);
      expect(service.predictDemand).toHaveBeenCalledWith('product-uuid', {
        warehouseId: 'warehouse-uuid',
        horizonDays: 30,
      });
      expect(result).toMatchObject({ predictedUnits: 45 });
    });

    it('should propagate ServiceUnavailableException when AI engine is down', async () => {
      service.predictDemand.mockRejectedValue(new ServiceUnavailableException());
      await expect(
        controller.predictDemand({ productId: 'product-uuid' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('getProductsInventoryReport', () => {
    it('should call service with warehouseId from JWT and return AI report', async () => {
      service.getProductsInventoryReport.mockResolvedValue(mockInventoryReport as any);
      const result = await controller.getProductsInventoryReport(mockUser);
      expect(service.getProductsInventoryReport).toHaveBeenCalledWith('warehouse-uuid');
      expect(result).toMatchObject({ warehouseId: 'warehouse-uuid' });
      expect(result.items).toHaveLength(1);
    });

    it('should propagate ServiceUnavailableException when AI engine is down', async () => {
      service.getProductsInventoryReport.mockRejectedValue(new ServiceUnavailableException());
      await expect(controller.getProductsInventoryReport(mockUser)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
