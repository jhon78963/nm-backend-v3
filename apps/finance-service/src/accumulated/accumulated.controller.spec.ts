import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccumulatedController } from './accumulated.controller';
import {
  AccumulatedAccountService,
  InitializeAccountDto,
  MonthEndTransferDto,
} from './accumulated-account.service';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const mockUser: AuthenticatedUser = {
  id: 'user-uuid',
  username: 'admin',
  tenantId: 'tenant-uuid',
  warehouseId: 'warehouse-uuid',
  roles: ['Admin'],
  mustChangePassword: false,
};

const mockSettings = {
  warehouseId: 'warehouse-uuid',
  cashBalance: 5000,
  digitalBalance: 3000,
  trackingStartMonth: '2026-01',
};

const mockPreview = {
  month: '2026-08',
  opening: { cash: 5000, digital: 3000 },
  movements: {
    cashIncome: 10000,
    cashExpense: 2000,
    digitalIncome: 5000,
    digitalExpense: 1000,
  },
  projected: { cash: 13000, digital: 7000 },
};

const mockTransfer = {
  id: 'transfer-uuid',
  warehouseId: 'warehouse-uuid',
  transferMonth: '2026-08',
  cashAmount: 13000,
  digitalAmount: 7000,
  closingCashAmount: 13000,
  closingDigitalAmount: 7000,
  projectedCashAmount: 13000,
  projectedDigitalAmount: 7000,
  notes: 'Cierre agosto 2026',
  createdById: 'user-uuid',
};

describe('AccumulatedController', () => {
  let controller: AccumulatedController;
  let service: jest.Mocked<AccumulatedAccountService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccumulatedController],
      providers: [
        {
          provide: AccumulatedAccountService,
          useValue: {
            showSettings: jest.fn(),
            initializeSettings: jest.fn(),
            updateSettings: jest.fn(),
            monthEndPreview: jest.fn(),
            listTransfers: jest.fn(),
            recordTransfer: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccumulatedController>(AccumulatedController);
    service = module.get(AccumulatedAccountService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('showSettings', () => {
    it('should return accumulated account settings', async () => {
      service.showSettings.mockResolvedValue(mockSettings as any);
      const result = await controller.showSettings(mockUser);
      expect(service.showSettings).toHaveBeenCalledWith('warehouse-uuid');
      expect(result).toMatchObject({ cashBalance: 5000 });
    });

    it('should propagate NotFoundException when not initialized', async () => {
      service.showSettings.mockRejectedValue(new NotFoundException());
      await expect(controller.showSettings(mockUser)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('initializeSettings', () => {
    it('should initialize and return settings (201)', async () => {
      const dto: InitializeAccountDto = {
        warehouseId: 'warehouse-uuid',
        cashBalance: 5000,
        digitalBalance: 3000,
        trackingStartMonth: '2026-01',
      };
      service.initializeSettings.mockResolvedValue(mockSettings as any);
      const result = await controller.initializeSettings(dto);
      expect(service.initializeSettings).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({ cashBalance: 5000 });
    });

    it('should propagate BadRequestException when already initialized', async () => {
      const dto: InitializeAccountDto = {
        warehouseId: 'warehouse-uuid',
        cashBalance: 5000,
        digitalBalance: 3000,
        trackingStartMonth: '2026-01',
      };
      service.initializeSettings.mockRejectedValue(new BadRequestException());
      await expect(controller.initializeSettings(dto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateSettings', () => {
    it('should update and return settings', async () => {
      const updated = { ...mockSettings, cashBalance: 6000 };
      service.updateSettings.mockResolvedValue(updated as any);
      const result = await controller.updateSettings(mockUser, { cashBalance: 6000 });
      expect(service.updateSettings).toHaveBeenCalledWith('warehouse-uuid', { cashBalance: 6000 });
      expect(result).toMatchObject({ cashBalance: 6000 });
    });
  });

  describe('monthEndPreview', () => {
    it('should return projected closing balance', async () => {
      service.monthEndPreview.mockResolvedValue(mockPreview as any);
      const result = await controller.monthEndPreview(mockUser, '2026-08');
      expect(service.monthEndPreview).toHaveBeenCalledWith('warehouse-uuid', '2026-08');
      expect(result).toMatchObject({ projected: { cash: 13000, digital: 7000 } });
    });
  });

  describe('listTransfers', () => {
    it('should return transfer history', async () => {
      service.listTransfers.mockResolvedValue([mockTransfer] as any);
      const result = await controller.listTransfers(mockUser);
      expect(service.listTransfers).toHaveBeenCalledWith('warehouse-uuid');
      expect(result).toHaveLength(1);
    });
  });

  describe('recordTransfer', () => {
    it('should register month-end transfer and return 201', async () => {
      const dto: MonthEndTransferDto = {
        warehouseId: 'warehouse-uuid',
        month: '2026-08',
        cashAmount: 13000,
        digitalAmount: 7000,
        notes: 'Cierre agosto 2026',
      };
      service.recordTransfer.mockResolvedValue(mockTransfer as any);
      const result = await controller.recordTransfer(dto, mockUser);
      expect(service.recordTransfer).toHaveBeenCalledWith(dto, 'user-uuid');
      expect(result).toMatchObject({ transferMonth: '2026-08' });
    });

    it('should propagate BadRequestException when transfer already exists', async () => {
      const dto: MonthEndTransferDto = {
        warehouseId: 'warehouse-uuid',
        month: '2026-08',
        cashAmount: 13000,
        digitalAmount: 7000,
      };
      service.recordTransfer.mockRejectedValue(new BadRequestException());
      await expect(controller.recordTransfer(dto, mockUser)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
